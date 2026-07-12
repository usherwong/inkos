// MythFlow 品牌 logo:M 字标 + 羽毛笔 + 星光(蓝紫渐变,深色底)。
// 位图资产在 public/assets/mythflow-logo.png,经 Vite 原样拷入 dist/assets/
// (studio 服务端只静态伺服 /assets/*,其余路径回退 SPA index.html)。
export function InkosLogo({ className }: { readonly className?: string }) {
  return (
    <img
      src="/assets/mythflow-logo.png"
      alt="MythFlow"
      className={className ? `${className} rounded-xl object-cover` : "rounded-xl object-cover"}
      draggable={false}
    />
  );
}
