// UI language for non-React modules (chat store, error copy) that cannot call
// the useI18n hook. App.tsx mirrors the project language here whenever it
// changes; the default matches useI18n's fallback ("zh") so behaviour without
// a loaded project (and in unit tests) is unchanged.

export type UiLang = "zh" | "en";

let uiLang: UiLang = "zh";

export function setUiLang(lang: UiLang): void {
  uiLang = lang;
}

export function getUiLang(): UiLang {
  return uiLang;
}
