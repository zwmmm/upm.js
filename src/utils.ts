import fs from 'fs'
import path from 'path'

const USER_HOME = process.env.HOME || process.env.USERPROFILE
const configPath = path.join(USER_HOME, '.upmrc')

export interface IConfig {
  accessKey: string
  secretKey: string
  bucket: string
}

export function getConfig() {
  if (!fs.existsSync(configPath)) return null
  const fileContent = fs.readFileSync(configPath, 'utf-8')
  return fileContent.split('\n').reduce((obj, item) => {
    const [key, value] = item.split('=')
    if (key && value) {
      return Object.assign(obj, { [key]: value })
    }
    return obj
  }, {})
}

export function updateConfig(config: IConfig) {
  const content = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  fs.writeFileSync(configPath, content)
}

export function showConfig() {
  if (!fs.existsSync(configPath)) return ''
  return fs.readFileSync(configPath, 'utf-8')
}
