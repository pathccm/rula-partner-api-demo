import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const args = ['watch']
if (existsSync(new URL('../.env', import.meta.url).pathname)) {
  args.push('--env-file=.env')
}
args.push('src/index.ts')

const child = spawn('tsx', args, { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
