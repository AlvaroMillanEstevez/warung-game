import { en } from './catalogs/en.ts';
import { es } from './catalogs/es.ts';
import { id } from './catalogs/id.ts';

export type Language = 'es' | 'en' | 'id';
export type Key = keyof typeof en;
export type Catalog = Record<Key, string>;
export type Params = Readonly<Record<string, string | number>>;
export type Message = Key | { readonly key: Key; readonly params: Params };
export const catalogs: Record<Language, Catalog> = { es, en, id };
export const LOCALES: Record<Language, string> = { es: 'es-ES', en: 'en-US', id: 'id-ID' };
export const STORAGE_KEY = 'warung-kita.language';

export function isLanguage(value: unknown): value is Language {
  return value === 'es' || value === 'en' || value === 'id';
}
export function detectLanguage(saved: unknown, preferences: readonly string[]): Language {
  if (isLanguage(saved)) return saved;
  for (const preference of preferences) {
    const base = preference.trim().toLowerCase().split(/[-_]/)[0];
    if (isLanguage(base)) return base;
  }
  return 'en';
}
export interface LanguageStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function initialLanguage(storage: () => LanguageStorage, preferences: readonly string[]): Language {
  let saved: string | null = null;
  try { saved = storage().getItem(STORAGE_KEY); } catch { /* Private mode or blocked storage. */ }
  return detectLanguage(saved, preferences);
}
export function saveLanguage(storage: () => LanguageStorage, language: Language): void {
  try { storage().setItem(STORAGE_KEY, language); } catch { /* Preference remains valid for this session. */ }
}

// Pure formatter: models retain keys/parameters and never depend on a selected language or the DOM.
export class Localization {
  private language: Language;
  private formatter: Intl.NumberFormat;
  private readonly listeners = new Set<() => void>();
  private readonly reported = new Set<string>();
  private readonly messages: Record<Language, Partial<Catalog>>;
  private readonly report: (problem: string) => void;
  constructor(language: Language = 'en', messages: Record<Language, Partial<Catalog>> = catalogs,
    report: (problem: string) => void = () => {}) {
    this.language = language; this.messages = messages; this.report = report;
    this.formatter = new Intl.NumberFormat(LOCALES[language]);
  }
  get current(): Language { return this.language; }
  setLanguage(language: Language): void {
    if (!isLanguage(language) || language === this.language) return;
    this.language = language; this.formatter = new Intl.NumberFormat(LOCALES[language]);
    for (const update of this.listeners) update();
  }
  subscribe(update: () => void): () => void {
    this.listeners.add(update);
    return () => { this.listeners.delete(update); };
  }
  number(value: number): string { return this.formatter.format(value); }
  t(message: Message, params: Params = {}): string {
    const key = typeof message === 'string' ? message : message.key;
    const values = typeof message === 'string' ? params : message.params;
    let template = this.messages[this.language][key];
    if (template === undefined) {
      const problem = this.language + ':' + key;
      if (!this.reported.has(problem)) {
        this.reported.add(problem); this.report('Missing translation: ' + problem);
      }
      template = this.messages.en[key] ?? en[key] ?? key;
    }
    return template.replace(/\{(\w+)\}/g, (token, name: string) => {
      const value = values[name];
      return typeof value === 'number' ? this.number(value) : value ?? token;
    });
  }
}
