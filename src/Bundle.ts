import chalk from 'chalk'
import * as fs from 'fs/promises'
import { glob } from 'glob-promise'
import * as path from 'path'
import { memoized, objectEntries, objectKeys } from 'ytil'
import { Language } from './Language'
import { Resource } from './Resource'
import { TranslateOptions, Translator } from './Translator'
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

  public addEmptyResource(name: string, format?: ResourceFormat): Resource {
    const resource = Resource.empty(this, name, format)
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
    let resource = this.resources.find(it => it.flatKeys().includes(key))
    if (resource == null) {
      resource = this.addEmptyResource('all')
    } else {
      resource.set(key, value)
    }
  }

  public remove(key: string) {
    for (const resource of this.resources) {
      resource.remove(key)
    }
  }

  // #endregion

  // #region Diffing & translating

  public async translateFrom(source: Bundle, options: TranslateFromOptions = {}) {
    const translator = new Translator(source, this)
    const {incremental = true, ...rest} = options

    const theirKeys = source.flatKeys()
    const ourKeys = this.flatKeys()

    const patch = await translator.translate({
      keys: incremental ? theirKeys.filter(it => !ourKeys.includes(it)) : undefined,
      ...rest
    })

    const keysToRemove = ourKeys.filter(it => !theirKeys.includes(it))
    for (const key of keysToRemove) {
      patch.remove(key)
    }
    
    const clone = this.clone()
    patch.apply(clone)
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

  public dump(stream: NodeJS.WritableStream = process.stdout) {
    for (const resource of this.resources) {
      stream.write(chalk`{bold.underline ${resource.relpath}}\n`)
      for (const [key, value] of resource.flatEntries()) {
        stream.write(`  ${key} = ${JSON.stringify(value)}\n`)
      }
      stream.write('\n')
    }
  }

  // #endregion

}

export interface TranslateFromOptions extends Omit<TranslateOptions, 'keys'> {
  incremental?: boolean
}