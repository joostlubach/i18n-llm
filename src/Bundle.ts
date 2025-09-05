import chalk from 'chalk'
import * as fs from 'fs/promises'
import { glob } from 'glob-promise'
import * as path from 'path'
import { memoized, objectEntries, objectKeys } from 'ytil'
import { Language } from './Language'
import { Patch } from './Patch'
import { Resource } from './Resource'
import { TranslateOptions, Translator } from './Translator'
import config from './config'
import { ResourceFormat, Translation } from './types'

export class Bundle {

  constructor(
    public readonly language: Language,
    public readonly bundlePath: string,
  ) {}

  public clone() {
    const clone = new Bundle(this.language, this.bundlePath)
    for (const resource of this.resources) {
      clone._resources.push(resource.clone())
    }

    return clone
  }

  // #region Loading

  /**
   * Loads many bundles from a root path. It is assumed that the names of the subdirectories
   * of the given root path are the language codes, and that each subdirectory contains
   * resource files.
   * 
   * @param rootPath The root path containing subdirectories for each language
   * @returns An array of loaded bundles
   */
  public static async loadMany(rootPath: string) {
    const bundles: Bundle[] = []
    for (const languageCode of await fs.readdir(rootPath)) {
      const resourcePath = path.join(rootPath, languageCode)
      const stat = await fs.stat(resourcePath)
      if (!stat.isDirectory()) { continue }

      const language = Language.get(languageCode)
      if (language == null) {
        console.warn(chalk`{yellow ⚠} Skipping unknown language code: {underline ${language}}`)
        continue
      }
        

      const bundle = await Bundle.load(language, resourcePath)
      bundles.push(bundle)
    }
    return bundles
  }

  /**
   * Loads a single bundle. It is assumed that the given root path contains resource files for
   * the specified language.
   * 
   * @param language The language code
   * @param bundlePath The root path containing resource files for the language
   * @returns The loaded bundle
   */
  public static async load(language: Language, bundlePath: string) {
    const bundle = new Bundle(language, bundlePath)
    for (const resourcePath of await glob.glob(path.join(bundlePath, '**/*.y?(a)ml'))) {
      const relpath = path.relative(bundlePath, resourcePath)
      await bundle.loadResource(relpath, resourcePath)
    }
  
    return bundle
  }

  // #endregion

  // #region Resources

  private _resources: Resource[] = []
  public get resources(): readonly Resource[] {
    return this._resources
  }

  public addResource(resource: Resource) {
    this._resources.push(resource)
    return resource
  }

  public addEmptyResource(nameOrRelpath: string, format?: ResourceFormat): Resource {
    format ??= this.resources.length > 0 ? this.resources[0].format : config.defaultFormat
    
    const extension = format === ResourceFormat.YAML ? 'yml' : 'json'
    const relpath = nameOrRelpath.includes('.') ? nameOrRelpath : `${nameOrRelpath}.${extension}`
    const resource = Resource.empty(this, relpath, format)
    return this.addResource(resource)
  }

  public async loadResource(name: string, path: string) {
    const resource = await Resource.load(this, name, path)
    return this.addResource(resource)
  }

  // #endregion

  // #region Accessors

  public flatKeys() {
    return objectKeys(this.flattened)
  }

  public flatEntries() {
    return objectEntries(this.flattened)
  }

  @memoized
  public get flattened(): Record<string, Translation> {
    return Object.assign({}, ...this.resources.map(it => it.flattened))
  }

  // #endregion

  // #region Get & set

  public get(key: string) {
    return this.flattened[key]
  }

  public set(key: string, value: Translation) {
    const root = key.split('.')[0]

    // Find the resource that contains this root.
    let resource = this.resources.find(it => it.roots.includes(root))

    // If not found, create a new resource for it.
    resource ??= this.addEmptyResource(root)
    resource.set(key, value)
  }

  public remove(key: string) {
    for (const resource of this.resources) {
      resource.remove(key)
    }
  }

  // #endregion

  // #region Merge

  public mergeDefaultsFrom(other: Bundle) {
    for (const source of other.resources) {
      let target = this.resources.find(it => it.relpath === source.relpath)
      if (target == null) {
        target = Resource.empty(this, source.relpath, source.format)
        this._resources.push(target)
      }

      target.mergeDefaultsFrom(source)
    }
  }
  
  // #endregion

  // #region Diffing & translating

  public async translateFrom(source: Bundle, options: TranslateFromOptions = {}) {
    const translator = new Translator(source, this)
    const {incremental = true, ...rest} = options

    const theirKeys = source.flatKeys()
    const ourKeys = this.flatKeys()


    let keys = incremental ? theirKeys.filter(it => !ourKeys.includes(it)) : ourKeys
    if (options.filter != null) {
      keys = keys.filter(it => options.filter?.test(it))
    }

    const patch = await translator.translate(keys, rest)

    const keysToRemove = ourKeys.filter(it => !theirKeys.includes(it))
    for (const key of keysToRemove) {
      patch.remove(key)
    }
    
    const clone = this.clone()
    options.onPreApply?.(clone, patch)
    patch.apply(clone, source)
    options.onPostApply?.(clone, patch)
    return clone
  }

  // #endregion

  // #region Writing

  public async write() {
    await fs.mkdir(this.bundlePath, {recursive: true})
    const promises = this.resources.map(it => it.write())
    await Promise.all(promises)
  }

  // #region Dump

  public dump(stream: NodeJS.WritableStream = process.stdout, formatLine: (line: string) => string = line => line) {
    for (const resource of this.resources) {
      stream.write(formatLine(chalk`{bold.underline ${resource.relpath}}`))
      for (const [key, value] of resource.flatEntries()) {
        stream.write(formatLine(`  ${key} = ${JSON.stringify(value)}`))
      }
      stream.write(formatLine(''))
    }
  }

  // #endregion

}

export interface TranslateFromOptions extends Omit<TranslateOptions, 'keys'> {
  incremental?: boolean
  filter?: RegExp
  
  onPreApply?: (bundle: Bundle, patch: Patch) => void
  onPostApply?: (bundle: Bundle, patch: Patch) => void
}
