import chalk from 'chalk'

export enum Mode {
  Sussecss = 'green',
  Error = 'red',
  Waring = 'yellow'
}

export default function print(
  text: string,
  mode?: Mode
): void {
  console.log(chalk[mode || Mode.Sussecss](text))
}
