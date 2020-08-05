import commander from 'commander'
import install from './install'
import init from './init'
import config from './config'

commander.version('0.0.1')
commander.command('init').description('初始化配置').action(init)
commander.command('install <name>').description('下载包').action(install)
commander.command('config list').description('查看配置信息').action(config.list)
commander
  .command('config set <key> <value>')
  .description('设置配置')
  .action(config.set)

commander.parse(process.argv)
