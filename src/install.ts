// @ts-ignore
import { prompt, MultiSelect } from 'enquirer'
import print, { Mode } from './print'
import compressing from 'compressing'
import path from 'path'
import fs from 'fs'
import { getConfig, IConfig } from './utils'
import rimraf from 'rimraf'
import request from 'request'
import ProgressBar from 'progress'
import { upoloadCdn } from './upload'

const npmRegistryURL = 'https://registry.npmjs.org'

function resolvePath(...paths) {
  return path.join(__dirname, ...paths)
}

function isScopedPackageName(packageName: string): boolean {
  return packageName.startsWith('@')
}

function encodePackageName(packageName) {
  return isScopedPackageName(packageName)
    ? `@${encodeURIComponent(packageName.substring(1))}`
    : encodeURIComponent(packageName)
}

function getFiles() {
  const fileList = {}
  const root = resolvePath('../package')
  const eachDir = (root, parent = '') => {
    const files = fs.readdirSync(root)
    files.forEach((item) => {
      const filepath: string = path.join(root, item)
      const filename: string = path.join(parent, item)
      if (fs.statSync(filepath).isDirectory()) {
        eachDir(filepath, filename)
        return
      }
      fileList[filename] = filepath
    })
  }
  eachDir(root)
  return fileList
}

export default async function (packageName: string) {
  try {
    const name = encodePackageName(packageName)
    const infoURL = `${npmRegistryURL}/${name}`
    print(`Fetching package info for ${packageName} from ${infoURL}`)
    const res = request.get(infoURL)
    res.on('response', (res) => {
      const bar = new ProgressBar(
        '  download [:bar] :rate/bps :percent :etas',
        {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: parseInt(res.headers['content-length'], 10)
        }
      )
      let fileChunk = ''
      res.on('data', (chunk) => {
        bar.tick(chunk.length)
        fileChunk += chunk
      })
      res.on('end', () => {
        const res = JSON.parse(fileChunk)
        const version = Object.keys(res.versions).pop()
        const tarballName = isScopedPackageName(packageName)
          ? packageName.split('/')[1]
          : packageName
        const tarballURL = `${npmRegistryURL}/${packageName}/-/${tarballName}-${version}.tgz`
        print('Unpacking...')
        request(tarballURL, { encoding: null }, async (err, res, body) => {
          if (err) {
            console.log(err)
            return
          }
          await compressing.tgz.uncompress(body, resolvePath('../'))
          const fileList = getFiles()
          const files = await new MultiSelect({
            name: 'files',
            message: '选择需要下载的文件',
            limit: 7,
            choices: Object.keys(fileList),
            loop: false
          }).run()
          const { cdn } = await prompt({
            type: 'confirm',
            name: 'cdn',
            message: '是否上传cdn？'
          })
          for await (let name of files) {
            const pathname = fileList[name]
            const filename = path.basename(pathname)
            fs.copyFileSync(pathname, path.join(process.cwd(), filename))
            if (cdn) {
              try {
                const config = getConfig() as IConfig
                await upoloadCdn(pathname, config)
                print(`${config.domain}/${filename} 上传成功`)
              } catch (e) {
                print(e, Mode.Error)
              }
            }
          }
          rimraf(resolvePath('../package'), () => {})
        })
      })
    })
  } catch (e) {
    print(e.message, Mode.Error)
  }
}
