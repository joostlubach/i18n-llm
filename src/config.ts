import { merge } from 'lodash'
import { env } from 'zodenv'
import { ResourceFormat } from './types'

export interface Config {
  defaultFormat: ResourceFormat

  openai: {
    apiKey: string | null
    model: string
    model_parameters: Record<string, any>
  }
}

const config: Config = {
  defaultFormat: ResourceFormat.YAML,
  openai: {
    apiKey: null,
    model: 'gpt-5',
    model_parameters: {
      text: {
        verbosity: 'low',
      },
      reasoning: {
        effort: 'minimal'
      },
    }
  }
}

export default config

export function configure(cfg?: Partial<Config>) {
  merge(config, cfg, {
    openai: {
      apiKey: env.tryString('OPENAI_APIKEY') ?? null,
    }
  })
}
configure()