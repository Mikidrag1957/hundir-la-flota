import { createServer } from 'http'
import next from 'next'
import { WebSocketServer } from 'ws'
import { setupWebSocket } from './server/roomManager'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res)
  })

  const wss = new WebSocketServer({ server })
  setupWebSocket(wss)

  const PORT = parseInt(process.env.PORT || '3000', 10)

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`ERROR: El puerto ${PORT} ya está en uso.`)
      console.error(`Cierra el otro proceso o usa: PORT=${PORT + 1} npm run dev`)
    } else {
      console.error('Error del servidor:', err.message)
    }
  })

  server.listen(PORT, () => {
    console.log(`> Servidor listo en http://localhost:${PORT}`)
    console.log(`> WebSocket listo en ws://localhost:${PORT}`)
  })
})

process.on('SIGINT', () => { process.exit() })
process.on('SIGTERM', () => { process.exit() })
