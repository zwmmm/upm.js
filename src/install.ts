import inquirer from 'inquirer'
import print, { Mode } from './print'
import compressing from 'compressing'
import path from 'path'
import urllib from 'urllib'
import fs from 'fs'
import qiniu from 'qiniu'
import { getConfig, IConfig } from './utils'
import rimraf from 'rimraf'

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

interface file {
  name: string
  path: string
}

function getFiles() {
  const fileList: Array<file> = []
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
      fileList.push({
        name: filename,
        path: filepath
      })
    })
  }
  eachDir(root)
  return fileList
}

function upoloadCdn(filepath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const config = getConfig() as IConfig
    if (!config || !config.accessKey || !config.secretKey || !config.bucket) {
      return reject('配置信息不全，请执行 upm init')
    }
    const mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey)
    const uploadConfig = {
      scope: config.bucket
    }
    const putPolicy = new qiniu.rs.PutPolicy(uploadConfig)
    const uploadToken = putPolicy.uploadToken(mac)
    const putExtra = new qiniu.form_up.PutExtra()
    const formUploader = new qiniu.form_up.FormUploader(uploadConfig)
    formUploader.putFile(
      uploadToken,
      path.basename(filepath),
      filepath,
      putExtra,
      (respErr, respBody, respInfo) => {
        if (respErr) {
          return reject(respErr)
        }
        if (respInfo.statusCode == 200) {
          resolve(respBody)
        } else {
          return reject(respBody)
        }
      }
    )
  })
}

export default async function (packageName: string) {
  try {
    const name = encodePackageName(packageName)
    const infoURL = `${npmRegistryURL}/${name}`
    print(`Fetching package info for ${packageName} from ${infoURL}`)
    const res = await urllib.request(infoURL, {
      timeout: [100000, 100000],
      dataType: 'json'
    })
    if (res.status !== 200) {
      print('fetch error', Mode.Error)
      return
    }
    const version = Object.keys(res.data.versions).pop()
    const tarballName = isScopedPackageName(packageName)
      ? packageName.split('/')[1]
      : packageName
    const tarballURL = `${npmRegistryURL}/${packageName}/-/${tarballName}-${version}.tgz`
    const packageInfo = await urllib.request(tarballURL, {
      streaming: true,
      followRedirect: true
    })
    if (packageInfo.status !== 200) {
      print('fetch error', Mode.Error)
      return
    }
    // @ts-ignore
    await compressing.tgz.uncompress(packageInfo.res, resolvePath('../'))
    const fileList = getFiles()
    const { files, cdn } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'files',
        message: '选择需要下载的文件',
        choices: fileList.map((item) => item.name),
        loop: false
      },
      {
        type: 'confirm',
        name: 'cdn',
        message: '是否上传cdn？'
      }
    ])
    for await (let name of files) {
      const pathname = fileList.find((file) => file.name === name).path
      const filename = path.basename(pathname)
      fs.copyFileSync(pathname, path.join(process.cwd(), filename))
      if (cdn) {
        try {
          await upoloadCdn(pathname)
          print(`${filename} 上传成功`)
        } catch (e) {
          print(e, Mode.Error)
        }
      }
    }
    rimraf(resolvePath('../package'), () => {})
  } catch (e) {
    print(e.message, Mode.Error)
  }
}