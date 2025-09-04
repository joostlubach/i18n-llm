import chalk from 'chalk'
import { Resource, ResourceOptions } from './Resource'

export class Bundle {

  private _resources: Resource[] = []
  public get resources(): readonly Resource[] {
    return this._resources
  }

  public addResource(resource: Resource) {
    this._resources.push(resource)
  }

  public async loadResource(path: string, options: ResourceOptions = {}) {
    const resource = await Resource.load(path, options)
    this.addResource(resource)
  }

  public dump(stream: NodeJS.WritableStream = process.stdout) {
    for (const resource of this.resources) {
      stream.write(chalk`{bold.underline ${resource.label}}\n`)
      for (const [key, value] of resource.entries()) {
        stream.write(`  ${key} = ${JSON.stringify(value)}\n`)
      }
      stream.write('\n')
    }
  }

}