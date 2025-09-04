import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { memoized, objectEntries, objectKeys } from 'ytil'

export class Resource {

  private constructor(
    public readonly path: string,
    public readonly mimeType: string,
    private readonly translations: Translations,
    options: ResourceOptions
  ) {
    this.label = options.label ?? path
  }

  public readonly label: string

  public static async load(filePath: string, options: ResourceOptions = {}): Promise<Resource> {
    const raw = await fs.readFile(filePath, 'utf8')
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.yml' || ext === '.yaml') {
      const content = yaml.parse(raw) as Translations
      return new Resource(filePath, 'application/x-yaml', content, options)
    } else if (ext === '.json') {
      const content = JSON.parse(raw) as Translations
      return new Resource(filePath, 'application/json', content, options)
    } else {
      throw new Error(`Unsupported file extension: ${ext}`)
    }
  }

  public entries() {
    return objectEntries(this.flattened)
  }

  @memoized
  public get keys() {
    return objectKeys(this.flattened)
  }

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


}

export interface ResourceOptions {
  label?: string
}

export type Translations = {
  [key: string]: string | Translations
}