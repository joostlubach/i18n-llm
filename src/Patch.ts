import { Bundle } from 'i18n-llm'
import { LanguageCode } from './Language'
import { Translation } from './types'

export class Patch {

  private _modifications: Modification[] = []
  public get modifications(): readonly Modification[] {
    return this._modifications
  }

  public isEmpty() {
    return this.modifications.length === 0
  }

  // #region Building

  public set(key: string, value: Translation) {
    this._modifications.push({type: 'set', key, value})
  }

  public translate(key: string, from: {language: LanguageCode, value: Translation}) {
    this._modifications.push({type: 'translate', key, from})
  }

  public remove(key: string) {
    this._modifications.push({type: 'remove', key})
  }

  // #endregion

  // #region Application

  public apply(bundle: Bundle) {
    for (const mod of this._modifications) {
      switch (mod.type) {
        case 'set':
          bundle.set(mod.key, mod.value)
          break
        case 'remove':
          bundle.remove(mod.key)
          break
      }
    }
  }

  // #endregion

  // #region Dump

  public dump(stream: NodeJS.WritableStream = process.stdout) {
    for (const mod of this._modifications) {
      switch (mod.type) {
        case 'set':
          stream.write(`+ ${mod.key} = ${JSON.stringify(mod.value)}\n`)
          break
        case 'translate':
          stream.write(`~ ${mod.key} = ${JSON.stringify(mod.from.value)} (from ${mod.from.language})\n`)
          break
        case 'remove':
          stream.write(`- ${mod.key}\n`)
          break
      }
    }
  }

}

export type Modification = SetModification | TranslateModification | RemoveModification

export interface SetModification {
  type: 'set'
  key: string
  value: Translation
}

export interface TranslateModification {
  type: 'translate'
  key: string
  from: {
    language: LanguageCode
    value: Translation
  }
}

export interface RemoveModification {
  type: 'remove'
  key: string
}