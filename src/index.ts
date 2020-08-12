import commander from 'commander'
import install from './install'
import init from './init'
import config from './config'
import upload from './upload'
// @ts-ignore
import { version } from '../package.json'

commander.version(version)
commander.command('init').description('初始化配置').action(init)
commander
  .command('install <name>')
  .description('下载包')
  .alias('i')
  .action(install)
commander
  .command('config <mode> [key] [value]', { noHelp: true })
  .action(config)
commander.command('upload <pathname>').description('上传文件').action(upload)

commander.on('--help', () => {
  console.log('  config list       查看配置信息')
  console.log('  config set <key> <value> 设置config')
})

commander.parse(process.argv)
