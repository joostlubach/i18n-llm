import { isFunction, isPlainObject } from 'lodash'
import { Language, LanguageCode } from './Language'

export type Translations = {[key: string]: Translation}
export type Translation = string | Translations

export type PerLanguage<T> =
  | ((language: Language) => T)
  | {[code in LanguageCode | '*']?: T}

export namespace PerLanguage {
  
  export function resolve<T>(value: T | PerLanguage<T> | undefined, language: Language): T | undefined {
    if (value == null) return undefined

    if (isFunction(value)) {
      return value(language)
    } else if (isPlainObject(value)) {
      return (value as any)[language.code] ?? (value as any)['*']
    } else {
      return value as T
    }
  }
  
}

export enum ResourceFormat {
  JSON,
  YAML
}