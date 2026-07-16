import { ExternalLink } from "lucide-react";
import { useI18n, type StringKey } from "../hooks/use-i18n";

interface ServiceQuickLink {
  readonly label: StringKey;
  readonly href: string;
}

const SERVICE_QUICK_LINKS: Record<string, ReadonlyArray<ServiceQuickLink>> = {
  kimicode: [
    { label: "svc.link.website", href: "https://www.kimi.com?aff=inkos" },
  ],
  kimiCodingPlan: [
    { label: "svc.link.website", href: "https://www.kimi.com?aff=inkos" },
  ],
  kkaiapi: [
    { label: "svc.link.website", href: "https://kkaiapi.com/" },
    { label: "svc.link.apiDocs", href: "https://kkaiapi.com/docs" },
    { label: "svc.link.modelsPricing", href: "https://kkaiapi.com/models" },
  ],
  moonshot: [
    { label: "svc.link.openPlatform", href: "https://platform.kimi.com?aff=inkos" },
  ],
  openrouter: [
    { label: "svc.link.apiKeys", href: "https://openrouter.ai/keys" },
    { label: "svc.link.models", href: "https://openrouter.ai/models" },
    { label: "svc.link.docs", href: "https://openrouter.ai/docs/api-reference/overview" },
  ],
};

export function getServiceQuickLinks(serviceId: string): ReadonlyArray<ServiceQuickLink> {
  return SERVICE_QUICK_LINKS[serviceId] ?? [];
}

export function ServiceQuickLinks({
  serviceId,
  variant = "detail",
  className = "",
}: {
  readonly serviceId: string;
  readonly variant?: "card" | "detail";
  readonly className?: string;
}) {
  const { t } = useI18n();
  const links = getServiceQuickLinks(serviceId);
  if (links.length === 0) return null;

  const compact = variant === "card";
  return (
    <div
      className={[
        "flex flex-wrap items-center gap-1.5 text-muted-foreground/70",
        compact ? "text-[11px]" : "text-xs",
        className,
      ].filter(Boolean).join(" ")}
    >
      {!compact && <span className="mr-0.5">{t("svc.link.entry")}</span>}
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className={[
            "inline-flex items-center gap-1 rounded-md border border-border/40 bg-card/50 font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground",
            compact ? "px-1.5 py-0.5" : "px-2 py-1",
          ].join(" ")}
        >
          {t(link.label)}
          <ExternalLink size={compact ? 10 : 11} />
        </a>
      ))}
    </div>
  );
}
