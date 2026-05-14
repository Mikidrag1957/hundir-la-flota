import { createServer } from 'http'
import next from 'next'
import { WebSocketServer } from 'ws'
import { setupWebSocket } from './server/roomManager'
import { WS_PATH } from './lib/constants'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res)
  })

  const wss = new WebSocketServer({ server, path: WS_PATH })
  setupWebSocket(wss)

  const PORT = parseInt(process.env.PORT || '3000', 10)

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\x1b[31mERROR: El puerto ${PORT} ya está en uso.\x1b[0m`)
      console.error(`\x1b[33mCierra el otro proceso o usa: PORT=${PORT + 1} npm run dev\x1b[0m`)
    } else {
      console.error('\x1b[31mError del servidor:\x1b[0m', err.message)
    }
  })

  server.listen(PORT, () => {
    const lines = [
      '╔══════════════════════════════════════╗',
      '║    HUNDIR LA FLOTA - MULTIJUGADOR    ║',
      '╠══════════════════════════════════════╣',
      `║  Servidor: http://localhost:${PORT}`.padEnd(39) + '║',
      '║                                      ║',
      '║  Comparte la URL con tus amigos      ║',
      '╚══════════════════════════════════════╝',
    ]
    console.log('\x1b[36m' + lines.join('\n') + '\x1b[0m')
  })
})

process.on('SIGINT', () => {
  console.log('\nCerrando servidor...')
  process.exit()
})
process.on('SIGTERM', () => {
  console.log('\nCerrando servidor...')
  process.exit()
})
