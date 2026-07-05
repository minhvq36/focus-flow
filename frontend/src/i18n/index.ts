import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import {
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  PRELOADED_NAMESPACES,
  DETECTION_ORDER,
  LANGUAGE_STORAGE_KEY,
  LOCALES_PATH,
  type LangCode,
} from './config'

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'common',
    ns: PRELOADED_NAMESPACES,
    supportedLngs: ['en', 'vi'],

    detection: {
      order: [...DETECTION_ORDER],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: [],
    },

    backend: {
      loadPath: LOCALES_PATH,
    },

    interpolation: {
      escapeValue: false,
    },
  })

const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LangCode | null
if (stored && !['en', 'vi'].includes(stored)) {
  i18n.changeLanguage(DEFAULT_LANGUAGE)
}

export default i18n