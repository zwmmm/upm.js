import print from './print'
import { IConfig, getConfig } from './utils'
import path from 'path'
import qiniu from 'qiniu'

export default async function (pathname: string) {
  const config = getConfig() as IConfig
  const filename = path.basename(pathname)
  await upoloadCdn(pathname, config)
  print(`${config.domain}/${filename} 上传成功`)
}

export function upoloadCdn(filepath: string, config: IConfig): Promise<any> {
  return new Promise((resolve, reject) => {
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
