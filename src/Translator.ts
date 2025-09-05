import * as fs from 'fs'
import { Bundle } from 'i18n-llm'
import { merge } from 'lodash'
import { makeParseableTextFormat } from 'openai/lib/parser'
import * as path from 'path'
import { enumerateBatches } from 'ytil'
import { z } from 'zod'
import { Patch } from './Patch'
import config from './config'
import { createOpenAI } from './openai'
import { PerLanguage } from './types'

const INSTRUCTIONS = fs.readFileSync(path.resolve(__dirname, 'instructions.txt'), 'utf8')

export class Translator {

  public constructor(
    public readonly source: Bundle,
    public readonly target: Bundle,
  ) {}

  private readonly openai = createOpenAI()

  public async translate(options: TranslateOptions = {}): Promise<Patch> {
    const {
      keys = this.source.flatKeys(),
      batchSize
    } = options

    const patch = new Patch()
    
    if (batchSize != null) {
      for (const batch of enumerateBatches(keys, batchSize)) {
        await this.translateBatch(batch, patch, options)
      }
    } else {
      await this.translateBatch(keys, patch, options)
    }

    return patch
  }

  private async translateBatch(keys: string[], patch: Patch, options: TranslateOptions) {
    const {
      purpose,
      notes,
      modifyStream,
    } = options

    const model = config.openai.model
    const modelParameters = config.openai.model_parameters
    const instructions = this.buildInstructions(
      purpose,
      PerLanguage.resolve(notes, this.target.language),
    )
    const input = this.buildInput(keys)

    const stream = this.openai.responses.stream(merge({
      model,

      instructions,
      input,

      text: {
        format: responseFormat
      }
    }, modelParameters))

    modifyStream?.(stream)

    const response = await stream.finalResponse()
    const translations = response.output_parsed?.translations ?? []
    for (const translation of translations) {
      patch.set(translation.key, translation.translation)
    }
  }

  private buildInstructions(purpose: string | undefined, notes: string[] | undefined) {
    return INSTRUCTIONS
      .replace('##PURPOSE##', purpose == null ? '' : `The purpose of the application is defined as: ${purpose}.`)
      .replace('##NOTES##', notes?.map(it => `- ${it}`).join('\n') ?? '')
  }

  private buildInput(keys: string[]) {
    const roots = new Set(keys.map(key => key.split('.')[0]))
    const fromSameRoot = (key: string) => roots.has(key.split('.')[0])

    const lines: string[] = [
      'ITEMS TO TRANSLATE',
      ...keys.map(key => {
        const value = this.source.get(key)
        return `${key}: ${value}`
      }),
      '',
      'CONTEXT',
      ...this.source.flatKeys().filter(fromSameRoot).map(key => {
        const value = this.source.get(key)
        return `${key}: ${value}`
      }),
      '',
    ]
    return lines.join('\n')
  }
  
}

const responseSchema = z.object({
  translations: z.array(z.object({
    key: z.string(),
    translation: z.string(),
  }))
})
const responseFormat = makeParseableTextFormat({
    name: 'translations',
    type: 'json_schema',
    schema: z.toJSONSchema(responseSchema),
    strict: true,
  },
  (content) => responseSchema.parse(JSON.parse(content)),
)

export interface TranslateOptions {
  keys?: string[]

  purpose?: string
  notes?: string[] | PerLanguage<string[]>

  batchSize?: number
  modifyStream?: (stream: ResponseStream) => void
}
export type ResponseStream = ReturnType<ReturnType<typeof createOpenAI>['responses']['stream']>
