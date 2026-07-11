// MythFlow 品牌 logo:M 字标 + 羽毛笔 + 星光(蓝紫渐变,深色底)。
// 位图资产在 public/mythflow-logo.png,经 Vite public 目录原样进 dist。
export function InkosLogo({ className }: { readonly className?: string }) {
  return (
    <img
      src="/mythflow-logo.png"
      alt="MythFlow"
      className={className ? `${className} rounded-xl object-cover` : "rounded-xl object-cover"}
      draggable={false}
    />
  );
}
