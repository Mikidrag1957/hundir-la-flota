"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const next_1 = __importDefault(require("next"));
const ws_1 = require("ws");
const roomManager_1 = require("./server/roomManager");
const dev = process.env.NODE_ENV !== 'production';
const app = (0, next_1.default)({ dev });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    const server = (0, http_1.createServer)((req, res) => {
        handle(req, res);
    });
    const wss = new ws_1.WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
    (0, roomManager_1.setupWebSocket)(wss);
    const PORT = parseInt(process.env.PORT || '3000', 10);
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`ERROR: El puerto ${PORT} ya está en uso.`);
            console.error(`Cierra el otro proceso o usa: PORT=${PORT + 1} npm run dev`);
        }
        else {
            console.error('Error del servidor:', err.message);
        }
    });
    server.listen(PORT, () => {
        console.log(`> Servidor listo en http://localhost:${PORT}`);
        console.log(`> WebSocket listo en ws://localhost:${PORT}`);
    });
});
process.on('SIGINT', () => { process.exit(); });
process.on('SIGTERM', () => { process.exit(); });
