"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = setupWebSocket;
const ws_1 = require("ws");
const constants_1 = require("../lib/constants");
const gameLogic_1 = require("./gameLogic");
const rooms = {};
let nextId = 1;
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 4; i++)
            code += chars[Math.floor(Math.random() * chars.length)];
    } while (rooms[code]);
    return code;
}
function broadcast(room, msg) {
    const data = JSON.stringify(msg);
    room.players.forEach((p) => {
        if (p.readyState === ws_1.WebSocket.OPEN)
            p.send(data);
    });
}
function handleCreateRoom(ws) {
    if (ws.room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Ya estás en una sala' }));
        return;
    }
    const code = generateRoomCode();
    rooms[code] = {
        code,
        players: [ws],
        boards: [null, null],
        ships: [null, null],
        ready: [false, false],
        turn: 0,
        phase: 'waiting',
        attacks: [[], []],
        winner: 0,
        restartVotes: [false, false],
    };
    ws.room = code;
    ws.playerNum = 1;
    ws.send(JSON.stringify({ type: 'room_created', code, playerNum: 1 }));
}
function handleJoinRoom(ws, code) {
    if (ws.room)
        return;
    const room = rooms[code];
    if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Sala no encontrada' }));
        return;
    }
    if (room.players.length >= 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Sala llena' }));
        return;
    }
    if (room.phase !== 'waiting') {
        ws.send(JSON.stringify({ type: 'error', message: 'La partida ya empezó' }));
        return;
    }
    room.players.push(ws);
    ws.room = code;
    ws.playerNum = 2;
    ws.send(JSON.stringify({ type: 'room_joined', code, playerNum: 2 }));
    broadcast(room, { type: 'opponent_joined', playerNum: 2 });
    room.phase = 'placement';
    broadcast(room, {
        type: 'phase_change',
        phase: 'placement',
        message: '¡Ambos jugadores conectados! Colocad vuestros barcos.',
    });
}
function handlePlaceShips(ws, ships) {
    if (!ws.room)
        return;
    const room = rooms[ws.room];
    if (!room || room.phase !== 'placement')
        return;
    const validated = (0, gameLogic_1.validateShips)(ships);
    if (!validated) {
        ws.send(JSON.stringify({ type: 'error', message: 'Colocación inválida' }));
        return;
    }
    const board = (0, gameLogic_1.createEmptyBoard)();
    for (const s of ships)
        for (const cell of s.cells)
            board[cell.r][cell.c] = { shipId: s.id, index: cell.index };
    const idx = ws.playerNum - 1;
    room.boards[idx] = board;
    room.ships[idx] = ships;
    ws.send(JSON.stringify({ type: 'ships_placed' }));
}
function handleSetReady(ws) {
    if (!ws.room)
        return;
    const room = rooms[ws.room];
    if (!room || room.phase !== 'placement')
        return;
    const idx = ws.playerNum - 1;
    if (!room.ships[idx]) {
        ws.send(JSON.stringify({ type: 'error', message: 'Coloca tus barcos primero' }));
        return;
    }
    room.ready[idx] = true;
    broadcast(room, { type: 'player_ready', playerNum: ws.playerNum });
    if (room.ready[0] && room.ready[1]) {
        room.phase = 'battle';
        room.turn = Math.random() < 0.5 ? 1 : 2;
        broadcast(room, {
            type: 'battle_start',
            firstTurn: room.turn,
            message: `¡Comienza la batalla! Turno del Jugador ${room.turn}.`,
        });
    }
}
function handleAttack(ws, r, c) {
    if (!ws.room)
        return;
    const room = rooms[ws.room];
    if (!room || room.phase !== 'battle' || room.turn !== ws.playerNum)
        return;
    const target = ws.playerNum === 1 ? 2 : 1;
    const targetIdx = target - 1;
    const board = room.boards[targetIdx];
    if (!board || r < 0 || r >= constants_1.TAM || c < 0 || c >= constants_1.TAM || board[r][c] === undefined) {
        ws.send(JSON.stringify({ type: 'error', message: 'Coordenadas inválidas' }));
        return;
    }
    const attackedKey = `${r},${c}`;
    if (room.attacks[0].includes(attackedKey) || room.attacks[1].includes(attackedKey)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Ya atacaste esa celda' }));
        return;
    }
    const cell = board[r][c];
    const hit = cell !== null;
    const attIdx = ws.playerNum - 1;
    room.attacks[attIdx].push(attackedKey);
    let sunk = null;
    let sunkCells = null;
    let shipId = null;
    if (hit) {
        shipId = cell.shipId;
        const targetShips = room.ships[targetIdx];
        if (targetShips) {
            const ship = targetShips.find((s) => s.id === shipId);
            if (ship && ship.cells.every((c) => room.attacks[attIdx].includes(`${c.r},${c.c}`))) {
                sunk = ship.name;
                sunkCells = ship.cells.map((cc) => ({ r: cc.r, c: cc.c, index: cc.index }));
            }
        }
    }
    broadcast(room, {
        type: 'attack_result',
        attacker: ws.playerNum,
        r,
        c,
        hit,
        sunk,
        sunkCells,
        shipId,
    });
    if (sunk && room.ships[targetIdx]) {
        const allSunk = (0, gameLogic_1.checkAllSunk)(room.ships[targetIdx], room.attacks[attIdx]);
        if (allSunk) {
            room.phase = 'gameover';
            room.winner = ws.playerNum;
            broadcast(room, {
                type: 'game_over',
                winner: ws.playerNum,
                message: `¡Jugador ${ws.playerNum} ha hundido toda la flota enemiga!`,
            });
            return;
        }
    }
    room.turn = hit ? ws.playerNum : target;
    broadcast(room, {
        type: 'turn_change',
        turn: room.turn,
        message: hit
            ? `¡Impacto! ${ws.playerNum === 1 ? 'Jugador 1' : 'Jugador 2'} repite.`
            : `Turno del Jugador ${room.turn}.`,
    });
}
function handleRestart(ws) {
    if (!ws.room)
        return;
    const room = rooms[ws.room];
    if (!room)
        return;
    room.restartVotes[ws.playerNum - 1] = true;
    broadcast(room, { type: 'restart_vote', playerNum: ws.playerNum });
    if (room.restartVotes[0] && room.restartVotes[1]) {
        room.boards = [null, null];
        room.ships = [null, null];
        room.ready = [false, false];
        room.turn = 0;
        room.phase = 'placement';
        room.attacks = [[], []];
        room.winner = 0;
        room.restartVotes = [false, false];
        broadcast(room, { type: 'restart', message: '¡Nueva partida! Colocad vuestros barcos.' });
    }
}
function handleDisconnect(ws) {
    if (!ws.room)
        return;
    const room = rooms[ws.room];
    if (!room)
        return;
    const other = room.players.find((p) => p !== ws && p.readyState === ws_1.WebSocket.OPEN);
    if (other)
        other.send(JSON.stringify({ type: 'opponent_disconnected' }));
    delete rooms[ws.room];
}
function handleMessage(ws, raw) {
    let msg;
    try {
        msg = JSON.parse(raw);
    }
    catch {
        return;
    }
    switch (msg.type) {
        case 'create_room':
            handleCreateRoom(ws);
            break;
        case 'join_room':
            handleJoinRoom(ws, msg.code);
            break;
        case 'place_ships':
            handlePlaceShips(ws, msg.ships);
            break;
        case 'set_ready':
            handleSetReady(ws);
            break;
        case 'attack':
            handleAttack(ws, msg.r, msg.c);
            break;
        case 'restart_request':
            handleRestart(ws);
            break;
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
    }
}
function setupWebSocket(wss) {
    wss.on('connection', (rawWs) => {
        const ws = rawWs;
        ws.id = nextId++;
        ws.room = null;
        ws.playerNum = 0;
        ws.alive = true;
        ws.on('pong', () => {
            ws.alive = true;
        });
        ws.on('message', (data) => {
            handleMessage(ws, data.toString());
        });
        ws.on('close', () => handleDisconnect(ws));
        ws.on('error', () => { });
        ws.send(JSON.stringify({ type: 'connected', id: ws.id }));
    });
    setInterval(() => {
        wss.clients.forEach((rawWs) => {
            const ws = rawWs;
            if (!ws.alive) {
                ws.terminate();
                return;
            }
            ws.alive = false;
            try {
                ws.ping();
            }
            catch {
                /* ignore */
            }
        });
    }, 30000);
}
