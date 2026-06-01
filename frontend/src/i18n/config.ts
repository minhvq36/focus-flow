export const SUPPORTED_LANGUAGES = {
  en: { code: 'en', label: 'English',    nativeLabel: 'English',    shortLabel: 'EN' },
  vi: { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', shortLabel: 'VI' },
} as const

export type LangCode = keyof typeof SUPPORTED_LANGUAGES

export const DEFAULT_LANGUAGE: LangCode = 'en'
export const FALLBACK_LANGUAGE: LangCode = 'en'

export const NAMESPACES = ['common', 'auth', 'garden', 'tasks', 'focus'] as const
export type Namespace = typeof NAMESPACES[number]

export const PRELOADED_NAMESPACES: Namespace[] = ['common']

export const DETECTION_ORDER = ['localStorage', 'navigator'] as const

export const LANGUAGE_STORAGE_KEY = 'focusflow_lang'

export const LOCALES_PATH = '/locales/{{lng}}/{{ns}}.json'