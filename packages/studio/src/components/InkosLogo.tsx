// 发行品牌 logo(cn=幻境工坊门廊标 / en=MythFlow M字标),按 window.__BRAND__ 切换。
// 位图资产在 public/assets/,经 Vite 原样拷入 dist/assets/
// (studio 服务端只静态伺服 /assets/*,其余路径回退 SPA index.html)。
import { BRAND_LOGO, BRAND_NAME } from "../lib/brand";

export function InkosLogo({ className }: { readonly className?: string }) {
  return (
    <img
      src={BRAND_LOGO}
      alt={BRAND_NAME}
      className={className ? `${className} rounded-xl object-cover` : "rounded-xl object-cover"}
      draggable={false}
    />
  );
}
