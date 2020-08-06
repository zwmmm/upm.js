import { prompt } from 'enquirer'
import fs from 'fs'
import path from 'path'

const USER_HOME = process.env.HOME || process.env.USERPROFILE

export default async function () {
  const { accessKey, secretKey, bucket } = await prompt([
    {
      type: 'password',
      name: 'accessKey',
      message: `填写accessKey`
    },
    {
      type: 'password',
      name: 'secretKey',
      message: `填写secretKey`
    },
    {
      type: 'password',
      name: 'bucket',
      message: `填写bucket`
    }
  ])
  const content = [
    `accessKey=${accessKey}`,
    `secretKey=${secretKey}`,
    `bucket=${bucket}`
  ].join('\n')
  fs.writeFileSync(path.join(USER_HOME, '.upmrc'), content, {})
}
