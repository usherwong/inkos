import type { MessagePart, ToolExecution, PipelineStage } from "./types";
import { localizeKnownRuntimeMessage } from "../../lib/error-copy";
import { getUiLang } from "../../lib/ui-lang";

// -- Event types for the builder --

export type StreamEvent =
  | { type: "thinking:start" }
  | { type: "thinking:delta"; text: string }
  | { type: "thinking:end" }
  | { type: "draft:delta"; text: string }
  | { type: "tool:start"; id: string; tool: string; agent?: string; stages?: string[] }
  | { type: "tool:end"; id: string; isError?: boolean; result?: unknown; details?: unknown }
  | { type: "log:stage"; stageName: string }
  | { type: "llm:progress"; status: string; elapsedMs: number; totalChars: number; chineseChars: number }
  | ContextCompressionStreamEvent;

export type ContextCompressionCategory = "session_context" | "story_context";
export type ContextCompressionPhase = "start" | "end" | "error";

export interface ContextCompressionStreamEvent {
  readonly type: "context:compression";
  readonly category: ContextCompressionCategory;
  readonly phase: ContextCompressionPhase;
  readonly message?: string;
  readonly protectedTokens?: number;
  readonly compressibleTokens?: number;
  readonly budgetTokens?: number;
  readonly sources?: readonly string[];
}

// -- Label helpers --

const AGENT_LABELS: Record<string, { zh: string; en: string }> = {
  architect: { zh: "建书", en: "Book setup" },
  writer: { zh: "写作", en: "Writing" },
  auditor: { zh: "审计", en: "Audit" },
  reviser: { zh: "修订", en: "Revision" },
  exporter: { zh: "导出", en: "Export" },
};
const TOOL_LABELS: Record<string, { zh: string; en: string }> = {
  read: { zh: "读取文件", en: "Read file" },
  edit: { zh: "编辑文件", en: "Edit file" },
  grep: { zh: "搜索", en: "Search" },
  ls: { zh: "列目录", en: "List directory" },
  context_compression: { zh: "整理上下文", en: "Compact context" },
  propose_action: { zh: "确认动作", en: "Confirm action" },
  short_fiction_run: { zh: "短篇生产", en: "Short fiction run" },
  generate_cover: { zh: "生成封面", en: "Generate cover" },
  play_edit: { zh: "编辑互动世界", en: "Edit play world" },
  play_start: { zh: "启动互动世界", en: "Start play world" },
  play_revise: { zh: "重做互动回合", en: "Redo play turn" },
  play_step: { zh: "推进互动世界", en: "Advance play world" },
};

function resolveToolLabel(tool: string, agent?: string): string {
  const lang = getUiLang();
  if (tool === "sub_agent" && agent) return AGENT_LABELS[agent]?.[lang] ?? agent;
  return TOOL_LABELS[tool]?.[lang] ?? tool;
}

function summarizeToolResult(result: unknown): string {
  if (typeof result === "string") return result.slice(0, 2000);
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    if (typeof record.content === "string") return record.content.slice(0, 2000);
    if (Array.isArray(record.content)) {
      const text = record.content
        .map((part) => {
          const item = part as { type?: unknown; text?: unknown };
          return item.type === "text" && typeof item.text === "string" ? item.text : "";
        })
        .filter(Boolean)
        .join("\n");
      if (text.trim()) return text.slice(0, 2000);
    }
  }
  return String(result ?? "").slice(0, 2000);
}

function compressionLabel(category: ContextCompressionCategory): string {
  if (getUiLang() === "en") {
    return category === "session_context" ? "Compact session memory" : "Compress story context";
  }
  return category === "session_context" ? "整理会话记忆" : "压缩故事上下文";
}

function compressionSourceSummary(sources: readonly string[] | undefined): string {
  if (!sources || sources.length === 0) return "";
  const preview = sources.slice(0, 3).join(", ");
  const suffix = sources.length > 3 ? ` +${sources.length - 3}` : "";
  return getUiLang() === "en"
    ? `Sources ${sources.length}: ${preview}${suffix}`
    : `来源 ${sources.length}: ${preview}${suffix}`;
}

function compressionProgress(event: ContextCompressionStreamEvent): PipelineStage["progress"] | undefined {
  if (event.phase !== "start") return undefined;
  const en = getUiLang() === "en";
  const parts = [
    event.protectedTokens !== undefined ? `${en ? "Protected" : "保护"} ${event.protectedTokens}` : "",
    event.compressibleTokens !== undefined ? `${en ? "Compressible" : "可压缩"} ${event.compressibleTokens}` : "",
    event.budgetTokens !== undefined ? `${en ? "Budget" : "预算"} ${event.budgetTokens}` : "",
    compressionSourceSummary(event.sources),
  ].filter(Boolean);
  return {
    status: parts.length > 0 ? parts.join(" · ") : "compressing",
    elapsedMs: 0,
    totalChars: 0,
    chineseChars: 0,
  };
}

function upsertCompressionStage(stages: PipelineStage[] | undefined, event: ContextCompressionStreamEvent): PipelineStage[] {
  const label = compressionLabel(event.category);
  const nextStatus: PipelineStage["status"] = event.phase === "start" ? "active" : "completed";
  const found = stages?.some((stage) => stage.label === label) ?? false;
  const base = found ? [...(stages ?? [])] : [...(stages ?? []), { label, status: "pending" as const }];
  return base.map((stage) =>
    stage.label === label
      ? {
          ...stage,
          status: nextStatus,
          progress: event.phase === "start" ? compressionProgress(event) : undefined,
        }
      : stage
  );
}

function applyContextCompressionEvent(parts: MessagePart[], event: ContextCompressionStreamEvent): void {
  const shouldUseStandaloneCard = event.category === "session_context";
  const runningTool = shouldUseStandaloneCard ? undefined : findLastRunningTool(parts);
  if (runningTool) {
    runningTool.stages = upsertCompressionStage(runningTool.stages, event);
    if (event.phase === "error") {
      runningTool.status = "error";
      runningTool.error = event.message ?? (getUiLang() === "en" ? `${compressionLabel(event.category)} failed` : `${compressionLabel(event.category)}失败`);
    }
    return;
  }

  const id = `context-${event.category}`;
  const existing = parts.find((part): part is { type: "tool"; execution: ToolExecution } =>
    part.type === "tool" && part.execution.id === id
  );
  const status: ToolExecution["status"] = event.phase === "start" ? "running" : event.phase === "error" ? "error" : "completed";
  const execution: ToolExecution = existing?.execution ?? {
    id,
    tool: "context_compression",
    label: compressionLabel(event.category),
    status,
    startedAt: Date.now(),
    stages: [],
  };
  execution.status = status;
  execution.label = compressionLabel(event.category);
  execution.stages = upsertCompressionStage(execution.stages, event);
  if (event.phase !== "start") execution.completedAt = Date.now();
  if (event.phase === "error") execution.error = event.message ?? (getUiLang() === "en" ? `${compressionLabel(event.category)} failed` : `${compressionLabel(event.category)}失败`);
  if (!existing) parts.push({ type: "tool", execution });
}

function findLastRunningTool(parts: MessagePart[]): ToolExecution | undefined {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.type === "tool" && p.execution.status === "running") return p.execution;
  }
  return undefined;
}

// -- Builder --

export function buildPartsFromEvents(events: StreamEvent[]): MessagePart[] {
  const parts: MessagePart[] = [];
  let suppressTextAfterPlayTool = false;

  /** Find the last tool part that is still "running". */
  function findRunningTool(): ToolExecution | undefined {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.type === "tool" && p.execution.status === "running") return p.execution;
    }
    return undefined;
  }

  function appendThinking(content: string): void {
    const last = parts[parts.length - 1];
    if (last?.type === "thinking") {
      last.content += content;
    } else {
      parts.push({ type: "thinking", content, streaming: false });
    }
  }

  for (const event of events) {
    switch (event.type) {
      case "thinking:start": {
        parts.push({ type: "thinking", content: "", streaming: true });
        break;
      }

      case "thinking:delta": {
        // Append to last thinking part
        const last = parts[parts.length - 1];
        if (last?.type === "thinking") {
          last.content += event.text;
        }
        break;
      }

      case "thinking:end": {
        const last = parts[parts.length - 1];
        if (last?.type === "thinking") {
          last.streaming = false;
        }
        break;
      }

      case "draft:delta": {
        if (suppressTextAfterPlayTool) {
          if (event.text.trim()) appendThinking(event.text);
          break;
        }
        // Append to last text part, or create a new one
        const last = parts[parts.length - 1];
        if (last?.type === "text") {
          last.content += event.text;
        } else {
          parts.push({ type: "text", content: event.text });
        }
        break;
      }

      case "tool:start": {
        // For pipeline operations (sub_agent), move trailing text to thinking
        // (it's the agent's reasoning before calling the tool, not user-facing content).
        // For utility tools (read/grep/edit/ls), keep text as-is.
        if (event.tool === "sub_agent") {
          const last = parts[parts.length - 1];
          if (last?.type === "text" && last.content) {
            parts.pop();
            const prevPart = parts[parts.length - 1];
            if (prevPart?.type === "thinking") {
              prevPart.content += (prevPart.content ? "\n\n" : "") + last.content;
            } else {
              parts.push({ type: "thinking", content: last.content, streaming: false });
            }
          }
        }

        const stages: PipelineStage[] | undefined = event.stages?.length
          ? event.stages.map((label) => ({ label, status: "pending" as const }))
          : undefined;

        const exec: ToolExecution = {
          id: event.id,
          tool: event.tool,
          agent: event.agent,
          label: resolveToolLabel(event.tool, event.agent),
          status: "running",
          stages,
          startedAt: Date.now(),
        };

        parts.push({ type: "tool", execution: exec });
        break;
      }

      case "tool:end": {
        // Find matching tool part by id
        for (const p of parts) {
          if (p.type === "tool" && p.execution.id === event.id) {
            const exec = p.execution;
            exec.status = event.isError ? "error" : "completed";
            exec.completedAt = Date.now();
            if (event.isError) exec.error = localizeKnownRuntimeMessage(summarizeToolResult(event.result));
            else exec.result = summarizeToolResult(event.result);
            if (event.details !== undefined) exec.details = event.details;
            if (!event.isError && (exec.tool === "play_start" || exec.tool === "play_step" || exec.tool === "play_revise")) {
              suppressTextAfterPlayTool = true;
            }
            // Mark all remaining stages as completed
            exec.stages = exec.stages?.map((s) =>
              s.status !== "completed" ? { ...s, status: "completed" as const, progress: undefined } : s
            );
            break;
          }
        }
        break;
      }

      case "log:stage": {
        const exec = findRunningTool();
        if (!exec?.stages) break;
        let found = false;
        exec.stages = exec.stages.map((stage) => {
          if (stage.label === event.stageName) {
            found = true;
            return { ...stage, status: "active" as const };
          }
          if (!found && stage.status === "active") {
            return { ...stage, status: "completed" as const, progress: undefined };
          }
          return stage;
        });
        break;
      }

      case "llm:progress": {
        const exec = findRunningTool();
        if (!exec?.stages) break;
        exec.stages = exec.stages.map((stage) =>
          stage.status === "active"
            ? { ...stage, progress: { status: event.status, elapsedMs: event.elapsedMs, totalChars: event.totalChars, chineseChars: event.chineseChars } }
            : stage
        );
        break;
      }

      case "context:compression": {
        applyContextCompressionEvent(parts, event);
        break;
      }
    }
  }

  return parts;
}
