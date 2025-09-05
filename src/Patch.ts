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

  public apply(bundle: Bundle, source?: Bundle) {
    for (const mod of this._modifications) {
      switch (mod.type) {
        case 'set': this.executeSet(bundle, mod, source); break
        case 'remove': this.executeRemove(bundle, mod); break
      }
    }
  }

  private executeSet(bundle: Bundle, mod: SetModification, source?: Bundle) {
    if (source != null) {
      // If the key to set has a root that exists in some resource in the source bundle, but this resource
      // does not exist in the target bundle, add an empty one. This ensure that we don't get a new resource
      // for every new key root, but the target bundle's anatomy follows the source bundle's.

      const root = mod.key.split('.')[0]
      const sourceResource = source.resources.find(it => it.roots.includes(root))
      if (sourceResource != null) {
        let targetResource = bundle.resources.find(it => it.relpath === sourceResource.relpath)
        if (targetResource == null) {
          targetResource = bundle.addEmptyResource(sourceResource.relpath, sourceResource.format)
        }
        targetResource.addRoot(root)
      }
    }

    bundle.set(mod.key, mod.value)
  }

  private executeRemove(bundle: Bundle, mod: RemoveModification) {
    bundle.remove(mod.key)
  }

  // #endregion

  // #region Dump

  public dump(stream: NodeJS.WritableStream = process.stdout, formatLine: (line: string) => string = line => line) {
    for (const mod of this._modifications) {
      switch (mod.type) {
        case 'set':
          stream.write(formatLine(`~ ${mod.key} = ${JSON.stringify(mod.value)}`))
          break
        case 'remove':
          stream.write(formatLine(`- ${mod.key}`))
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