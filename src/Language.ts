export const languages = [
  {code: 'en', name: 'English', local_name: 'English'},
  {code: 'es', name: 'Spanish', local_name: 'Español'},
  {code: 'fr', name: 'French', local_name: 'Français'},
  {code: 'de', name: 'German', local_name: 'Deutsch'},
  {code: 'it', name: 'Italian', local_name: 'Italiano'},
  {code: 'pt', name: 'Portuguese', local_name: 'Português'},
  {code: 'ru', name: 'Russian', local_name: 'Русский'},
  {code: 'ja', name: 'Japanese', local_name: '日本語'},
  {code: 'ko', name: 'Korean', local_name: '한국어'},
  {code: 'zh', name: 'Chinese', local_name: '中文'},
  {code: 'ar', name: 'Arabic', local_name: 'العربية'},
  {code: 'hi', name: 'Hindi', local_name: 'हिन्दी'},
  {code: 'nl', name: 'Dutch', local_name: 'Nederlands'},
  {code: 'sv', name: 'Swedish', local_name: 'Svenska'},
  {code: 'no', name: 'Norwegian', local_name: 'Norsk'},
  {code: 'da', name: 'Danish', local_name: 'Dansk'},
  {code: 'fi', name: 'Finnish', local_name: 'Suomi'},
  {code: 'pl', name: 'Polish', local_name: 'Polski'},
  {code: 'tr', name: 'Turkish', local_name: 'Türkçe'},
  {code: 'he', name: 'Hebrew', local_name: 'עברית'},
  {code: 'th', name: 'Thai', local_name: 'ไทย'},
  {code: 'vi', name: 'Vietnamese', local_name: 'Tiếng Việt'},
  {code: 'cs', name: 'Czech', local_name: 'Čeština'},
  {code: 'hu', name: 'Hungarian', local_name: 'Magyar'},
  {code: 'ro', name: 'Romanian', local_name: 'Română'},
  {code: 'el', name: 'Greek', local_name: 'Ελληνικά'}
] as const

export type Language = (typeof languages)[number]
export type LanguageCode = Language['code']

export namespace Language {
  
  export function get(code: string): Language | undefined {
    return languages.find(it => it.code === code)
  }

  export function isKnownLanguage(code: string): code is LanguageCode {
    return languages.some(it => it.code === code)
  }

}