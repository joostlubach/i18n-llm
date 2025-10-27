import * as fs from 'fs/promises'
import { cloneDeep, uniq } from 'lodash'
import * as path from 'path'
import * as yaml from 'yaml'
import { memoized, objectEntries, objectKeys } from 'ytil'
import { Bundle } from './Bundle'
import config from './config'
import { ResourceFormat, Translation, Translations } from './types'

export class Resource {

  private constructor(
    private readonly bundle: Bundle,
    public readonly relpath: string,
    public readonly format: ResourceFormat,
    private readonly translations: Translations,
  ) {}

  public clone() {
    return new Resource(
      this.bundle,
      this.relpath,
      this.format,
      cloneDeep(this.translations),
    )
  }

  // #region Factory

  public static empty(bundle: Bundle, path: string, format: ResourceFormat = config.defaultFormat) {
    return new Resource(bundle, path, format, {})
  }

  public static async load(bundle: Bundle, name: string, fromPath: string): Promise<Resource> {
    const raw = await fs.readFile(fromPath, 'utf8')
    const ext = path.extname(fromPath).toLowerCase()
    if (ext === '.yml' || ext === '.yaml') {
      const content = (yaml.parse(raw) ?? {}) as Translations
      return new Resource(bundle, name, ResourceFormat.YAML, content)
    } else if (ext === '.json') {
      const content = (JSON.parse(raw) ?? {}) as Translations
      return new Resource(bundle, name, ResourceFormat.JSON, content)
    } else {
      throw new Error(`Unsupported file extension: ${ext}`)
    }
  }

  // #endregion

  // #region Accessors

  public flatKeys() {
    return objectKeys(this.flattened)
  }

  public flatEntries() {
    return objectEntries(this.flattened)
  }

  // #endregion

  // #region Roots

  private _roots: string[] | undefined = undefined
  public get roots(): readonly string[] {
    return this._roots ??= this.deriveRoots()
  }

  private deriveRoots() {
    return uniq(this.flatKeys().map(it => it.split('.')[0])).sort()
  }

  public addRoot(root: string) {
    const roots = this._roots ??= this.deriveRoots()
    if (!roots.includes(root)) {
      roots.push(root)
    }
    this._roots = roots.sort()
  }

  // #endregion

  // #region Get & set

  public get(key: string) {
    return this.flattened[key]
  }

  public set(key: string, value: Translation) {
    const keys = key.split('.')
    let current: Translations = this.translations

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]

      if (i === keys.length - 1) {
        current[k] = value
      } else {
        if (typeof current[k] !== 'object' || current[k] === null) {
          current[k] = {}
        }
        current = current[k] as Translations
      }
    }
  }

  public remove(key: string) {
    const keys = key.split('.')
    let current: Translations = this.translations

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]

      if (i === keys.length - 1) {
        delete current[k]
      } else {
        if (typeof current[k] !== 'object' || current[k] === null) {
          return
        }
        current = current[k] as Translations
      }
    }
  }

  // #endregion

  // #region Merge

  public mergeDefaultsFrom(other: Resource) {
    for (const [key, value] of other.flatEntries()) {
      if (this.get(key) != null) { continue }
      this.set(key, value)
    }
  }

  // #endregion

  // #region Flattening

  @memoized
  public get flattened() {
    const flattened: Record<string, string> = {}

    const flatten = (current: Translations, prefix = '') => {
      for (const [key, value] of Object.entries(current)) {
        const newKey = prefix ? `${prefix}.${key}` : key

        if (typeof value === 'string') {
          flattened[newKey] = value
        } else if (typeof value === 'object' && value !== null) {
          flatten(value, newKey)
        }
      }
    }

    flatten(this.translations)
    return flattened
  }

  // #endregion

  // #region Writing

  public async write() {
    const targetPath = path.join(this.bundle.bundlePath, this.relpath)
    await fs.mkdir(path.dirname(targetPath), {recursive: true})

    let data: string
    if (this.format === ResourceFormat.YAML) {
      data = yaml.stringify(this.translations)
    } else if (this.format === ResourceFormat.JSON) {
      data = JSON.stringify(this.translations, null, 2) + '\n'
    } else {
      throw new Error(`Unsupported format: ${this.format}`)
    }

    await fs.writeFile(targetPath, data, 'utf8')
  }

  // #endregion

}

export interface ResourceOptions {
  label?: string
}