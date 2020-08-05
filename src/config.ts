import { getConfig, showConfig, updateConfig, IConfig } from './utils'
import print, { Mode } from './print'

export default {
  list() {
    print(showConfig())
  },
  set(key, value) {
    const config = getConfig()
    if (!config) {
      print('暂无配置文件，请执行 upm init', Mode.Waring)
      return
    }
    config[key] = value
    updateConfig(config as IConfig)
  }
}
