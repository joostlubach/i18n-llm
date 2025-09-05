import { ClientOptions, OpenAI } from 'openai'
import config from './config'

export function createOpenAI(options: Omit<ClientOptions, 'apiKey'> = {}) {
  const {apiKey} = config.openai
  if (apiKey == null) {
    throw new Error('OpenAI API key is not configured')
  }

  return new OpenAI({
    apiKey,
    ...options,
  })
}