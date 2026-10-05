import { Localization, initialLanguage, saveLanguage } from './core.ts';
import type { Key, Language, Message, Params } from './core.ts';
export type { Key, Language, Message } from './core.ts';

export const i18n = new Localization('en', undefined,
  problem => { if (import.meta.env.DEV) console.warn('[i18n] ' + problem); });
export const t = (message: Message, params?: Params): string => i18n.t(message, params);
export function chooseLanguage(language: Language): void {
  saveLanguage(() => window.localStorage, language);
  i18n.setLanguage(language);
}
export function localizeDocument(): void {
  document.documentElement.lang = i18n.current;
  document.title = t('app.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'));
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]'))
    element.textContent = t(element.dataset.i18n as Key);
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-aria]'))
    element.setAttribute('aria-label', t(element.dataset.i18nAria as Key));
}
export function initializeLanguage(): () => void {
  i18n.setLanguage(initialLanguage(() => window.localStorage,
    navigator.languages?.length ? navigator.languages : [navigator.language]));
  localizeDocument();
  return i18n.subscribe(localizeDocument);
}
