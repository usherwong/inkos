// 发行品牌(由壳经 INKOS_BRAND → 服务端注入 window.__BRAND__ 决定,与 UI 语言无关):
// cn = 幻境工坊 · 工作台;en(默认,含 vite dev)= MythFlow Studio。
declare global {
  interface Window {
    __BRAND__?: string;
  }
}

export const IS_CN_BRAND: boolean =
  typeof window !== "undefined" && window.__BRAND__ === "cn";

export const BRAND_NAME = IS_CN_BRAND ? "幻境工坊" : "MythFlow";
export const BRAND_SUB = IS_CN_BRAND ? "工作台" : "Studio";
export const BRAND_FULL = IS_CN_BRAND ? "幻境工坊 · 工作台" : "MythFlow Studio";
export const BRAND_LOGO = IS_CN_BRAND ? "/assets/hjgf-logo.png" : "/assets/mythflow-logo.png";
