import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY, type LangCode } from '@/i18n/config'

export function useLanguage() {
  const { i18n } = useTranslation()

  const currentLang = (i18n.resolvedLanguage ?? 'en') as LangCode

  const setLanguage = useCallback((lang: LangCode) => {
    if (lang === currentLang) return
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    i18n.changeLanguage(lang)
  }, [i18n, currentLang])

  return {
    currentLang,
    setLanguage,
    languages: Object.values(SUPPORTED_LANGUAGES),
  }
}