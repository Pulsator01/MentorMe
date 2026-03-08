import { spawn } from 'node:child_process'

const processes = [
  ['npm', ['run', 'api:dev']],
  ['npm', ['run', 'worker:dev']],
  ['npm', ['run', 'dev']],
]

const children = processes.map(([command, args]) =>
  spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      EXPOSE_DEBUG_TOKENS: process.env.EXPOSE_DEBUG_TOKENS || 'true',
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
    },
  }),
)

const shutdown = () => {
  children.forEach((child) => child.kill('SIGTERM'))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
