import { getConfig, IConfig, showConfig, updateConfig } from './utils'
import print, { Mode } from './print'

export default function (mode, key, value) {
  if (mode === 'list') {
    print(showConfig())
  } else if (mode === 'set') {
    const config = getConfig()
    if (!config) {
      print('暂无配置文件，请执行 upm init', Mode.Waring)
      return
    }
    if (!['accessKey', 'secretKey', 'bucket'].includes(key)) {
      print('只能设置 accessKey ｜ secretKey ｜ bucket', Mode.Waring)
      return
    }
    config[key] = value
    updateConfig(config as IConfig)
  } else {
    print('暂不支持此命令', Mode.Error)
  }
}
