import { useEffect, useState } from "react";
import type { SSEMessage } from "../../hooks/use-sse";
import { Loader2, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import type { TFunction } from "../../hooks/use-i18n";
import { SidebarCard } from "./SidebarCard";

// The zh step names double as match keys against backend log/SSE messages, so
// they must stay exactly as emitted; STEP_LABELS_EN only changes the display.
const INIT_BOOK_STEPS = [
  "生成基础设定",
  "保存书籍配置",
  "写入基础设定文件",
  "初始化控制文档",
  "创建初始快照",
] as const;

const WRITE_CHAPTER_STEPS = [
  "准备章节输入",
  "撰写章节草稿",
  "落盘最终章节",
  "生成最终真相文件",
  "校验真相文件变更",
  "同步记忆索引",
  "更新章节索引与快照",
] as const;

const STEP_LABELS_EN: Record<string, string> = {
  "生成基础设定": "Generating foundation",
  "保存书籍配置": "Saving book config",
  "写入基础设定文件": "Writing foundation files",
  "初始化控制文档": "Initializing control docs",
  "创建初始快照": "Creating initial snapshot",
  "准备章节输入": "Preparing chapter input",
  "撰写章节草稿": "Drafting chapter",
  "落盘最终章节": "Saving final chapter",
  "生成最终真相文件": "Generating truth files",
  "校验真相文件变更": "Validating truth changes",
  "同步记忆索引": "Syncing memory index",
  "更新章节索引与快照": "Updating index & snapshot",
};

type StepStatus = "pending" | "active" | "done";

interface ProgressSectionProps {
  readonly sse: { messages: ReadonlyArray<SSEMessage>; connected: boolean };
  readonly t: TFunction;
}

export function ProgressSection({ sse, t }: ProgressSectionProps) {
  const isZh = t("nav.connected") === "已连接";
  const [operation, setOperation] = useState<"idle" | "init" | "write">("idle");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState<string | null>(null);

  useEffect(() => {
    const latest = sse.messages;
    if (latest.length === 0) return;
    const last = latest[latest.length - 1];

    if (last.event === "book:creating") {
      setOperation("init");
      setCompletedSteps(new Set());
      setActiveStep(null);
    } else if (last.event === "write:start") {
      setOperation("write");
      setCompletedSteps(new Set());
      setActiveStep(null);
    } else if (last.event === "book:created" || last.event === "write:complete") {
      // Mark all steps done
      const steps = operation === "init" ? INIT_BOOK_STEPS : WRITE_CHAPTER_STEPS;
      setCompletedSteps(new Set(steps));
      setActiveStep(null);
    } else if (last.event === "log") {
      const data = last.data as { message?: string } | null;
      const message = data?.message;
      if (message && operation !== "idle") {
        // Mark previous active step as done, set new active
        setCompletedSteps((prev) => {
          if (activeStep) {
            const next = new Set(prev);
            next.add(activeStep);
            return next;
          }
          return prev;
        });
        setActiveStep(message);
      }
    }
  }, [sse.messages]);

  const steps = operation === "init" ? INIT_BOOK_STEPS
    : operation === "write" ? WRITE_CHAPTER_STEPS
    : null;

  if (!steps) return null;

  return (
    <SidebarCard title={t("book.execution")}>
      <ul className="space-y-2">
        {steps.map((step, i) => {
          const status: StepStatus = completedSteps.has(step) ? "done"
            : activeStep === step ? "active"
            : "pending";
          return (
            <li key={step} className="flex items-center gap-2.5">
              <StepIndicator index={i + 1} status={status} />
              <span className={cn(
                "text-xs",
                status === "done" && "text-muted-foreground",
                status === "active" && "text-foreground font-medium",
                status === "pending" && "text-muted-foreground/50",
              )}>
                {isZh ? step : STEP_LABELS_EN[step] ?? step}
              </span>
            </li>
          );
        })}
      </ul>
    </SidebarCard>
  );
}

function StepIndicator({ index, status }: { readonly index: number; readonly status: StepStatus }) {
  if (status === "done") {
    return (
      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
        <Check size={12} className="text-primary-foreground" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
        <Loader2 size={10} className="text-primary animate-spin" />
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full border border-border/60 flex items-center justify-center shrink-0">
      <span className="text-[10px] text-muted-foreground/50">{index}</span>
    </div>
  );
}
