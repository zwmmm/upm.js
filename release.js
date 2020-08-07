const { prompt } = require('enquirer')
const chalk = require('chalk')
const execa = require('execa')
const semver = require('semver')
const path = require('path')
const fs = require('fs')

const versionIncrements = ['patch', 'minor', 'major']
const currentVersion = require('./package.json').version
const inc = (i) => semver.inc(currentVersion, i)
const step = (msg) => console.log(chalk.cyan(msg))
const run = (bin, args, opts = {}) =>
  execa(bin, args, { stdio: 'inherit', ...opts })

function updateVersions(version) {
  const pkgPath = path.resolve(__dirname, '.', 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.version = version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

async function main() {
  let targetVersion = ''
  const { release } = await prompt({
    type: 'select',
    name: 'release',
    message: 'Select release type',
    choices: versionIncrements.map((i) => `${i} (${inc(i)})`).concat(['custom'])
  })

  if (release === 'custom') {
    targetVersion = (
      await prompt({
        type: 'input',
        name: 'version',
        message: 'Input custom version',
        initial: currentVersion
      })
    ).version
  } else {
    targetVersion = release.match(/\((.*)\)/)[1]
  }

  if (!semver.valid(targetVersion)) {
    throw new Error(`invalid target version: ${targetVersion}`)
  }

  const { yes } = await prompt({
    type: 'confirm',
    name: 'yes',
    message: `Releasing v${targetVersion}. Confirm?`
  })

  if (!yes) {
    return
  }

  step('\nUpdating Version...')
  updateVersions(targetVersion)

  step('\nPublishing packages...')
  await run('npm', ['publish', '--registry=https://registry.npmjs.org/'])

  step('\nGenerate changelog...')
  await run(`yarn`, ['changelog'])

  step('\nPushing to GitHub...')
  const { stdout } = await run('git', ['diff'], { stdio: 'pipe' })
  if (stdout) {
    step('\nCommitting changes...')
    await run('git', ['add', '-A'])
    await run('git', ['commit', '-m', `release: v${targetVersion}`])
    await run('git', ['push'])
  } else {
    console.log('No changes to commit.')
  }
}

main()
  .then(() => {
    step('\nRelease success')
  })
  .catch(() => {
    step('\nRelease error')
  })
