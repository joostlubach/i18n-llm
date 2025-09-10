# i18n-llm

A DevOps tool for incrementally translating locale files using Large Language Models (LLMs).

## Overview

`i18n-llm` is a TypeScript package that automates the translation of internationalization (i18n) locale files. It uses OpenAI's GPT models to intelligently translate missing keys while preserving existing translations, making it perfect for maintaining multilingual applications.

## Features

- 🤖 **AI-Powered Translation**: Uses OpenAI GPT models for high-quality translations
- 📦 **Incremental Updates**: Only translates missing keys, preserving existing translations
- 🔄 **Batch Processing**: Handles large translation sets efficiently with configurable batch sizes
- 📝 **Multiple Formats**: Supports both JSON and YAML locale files
- 🌍 **Language-Aware**: Smart language detection and context-aware translations
- ⚡ **TypeScript First**: Fully typed with excellent developer experience

## Installation

```bash
npm install i18n-llm
# or
yarn add i18n-llm
# or
bun add i18n-llm
```

## Configuration

Set up your OpenAI API key:

```bash
export OPENAI_APIKEY=your_api_key_here
```

Or configure programmatically:

```typescript
import { configure } from 'i18n-llm'

configure({
  openai: {
    apiKey: 'your_api_key_here',
    model: 'gpt-4', // or 'gpt-3.5-turbo'
    model_parameters: {
      text: { verbosity: 'low' },
      reasoning: { effort: 'minimal' }
    }
  },
  defaultFormat: ResourceFormat.YAML // or ResourceFormat.JSON
})
```

## Usage

### Basic Translation

```typescript
import { Bundle, Translator, Language } from 'i18n-llm'

// Load source and target bundles
const sourceBundle = Bundle.fromDirectory('./locales/en')
const targetBundle = Bundle.fromDirectory('./locales/es')

// Create translator
const translator = new Translator(sourceBundle, targetBundle)

// Translate missing keys
const missingKeys = targetBundle.getMissingKeys(sourceBundle)
const patch = await translator.translate(missingKeys)

// Apply the translations
await targetBundle.applyPatch(patch)
```

### Working with Languages

```typescript
import { Language } from 'i18n-llm'

const english = new Language('en', 'English')
const spanish = new Language('es', 'Spanish')
const french = new Language('fr', 'French')
```

### Batch Translation

```typescript
const patch = await translator.translate(keys, {
  batchSize: 10 // Process 10 keys at a time
})
```

### Resource Formats

The package supports both JSON and YAML formats:

```typescript
// JSON format
{
  "welcome": "Welcome",
  "user": {
    "name": "Name",
    "email": "Email"
  }
}

// YAML format
welcome: Welcome
user:
  name: Name
  email: Email
```

## API Reference

### Classes

#### `Bundle`
Represents a collection of locale resources.

- `Bundle.fromDirectory(path: string)` - Load bundle from directory
- `getMissingKeys(other: Bundle)` - Get keys missing in this bundle
- `applyPatch(patch: Patch)` - Apply translation patch

#### `Translator`
Handles the translation process using LLMs.

- `translate(keys: string[], options?)` - Translate specified keys
- `constructor(source: Bundle, target: Bundle)` - Create translator

#### `Language`
Represents a language with code and display name.

- `constructor(code: string, name: string)` - Create language instance

#### `Patch`
Represents a set of translation changes.

### Types

```typescript
type Translations = {[key: string]: Translation}
type Translation = string | Translations

enum ResourceFormat {
  JSON,
  YAML
}
```

## Environment Variables

- `OPENAI_APIKEY` - Your OpenAI API key (required)

## CLI Integration

This package is designed to be used with CLI tools. See the usage in your project's locale management scripts for practical examples.

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Author

Joost Lubach <joostlubach@gmail.com>