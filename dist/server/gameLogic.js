"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canPlace = canPlace;
exports.placeShip = placeShip;
exports.validateShips = validateShips;
exports.createEmptyBoard = createEmptyBoard;
exports.randomPlacement = randomPlacement;
exports.checkAllSunk = checkAllSunk;
const constants_1 = require("../lib/constants");
function canPlace(board, row, col, size, orientation) {
    for (let i = 0; i < size; i++) {
        const r = orientation === 'h' ? row : row + i;
        const c = orientation === 'h' ? col + i : col;
        if (r < 0 || r >= constants_1.TAM || c < 0 || c >= constants_1.TAM)
            return false;
        if (board[r][c] !== null)
            return false;
    }
    return true;
}
function placeShip(board, row, col, size, orientation, shipId) {
    const cells = [];
    for (let i = 0; i < size; i++) {
        const r = orientation === 'h' ? row : row + i;
        const c = orientation === 'h' ? col + i : col;
        board[r][c] = { shipId, index: i };
        cells.push({ r, c, index: i });
    }
    return cells;
}
function validateShips(ships) {
    const board = Array.from({ length: constants_1.TAM }, () => Array(constants_1.TAM).fill(null));
    const placed = {};
    for (const s of ships) {
        const ship = s;
        if (!ship.id || typeof ship.id !== 'string')
            return null;
        const shipDef = constants_1.SHIPS.find((sh) => sh.id === ship.id);
        if (!shipDef)
            return null;
        if (placed[ship.id])
            return null;
        if (ship.orientation !== 'h' && ship.orientation !== 'v')
            return null;
        if (typeof ship.row !== 'number' || typeof ship.col !== 'number')
            return null;
        const orientation = ship.orientation;
        if (!canPlace(board, ship.row, ship.col, shipDef.size, orientation))
            return null;
        ship.cells = placeShip(board, ship.row, ship.col, shipDef.size, orientation, ship.id);
        placed[ship.id] = true;
    }
    return placed;
}
function createEmptyBoard() {
    return Array.from({ length: constants_1.TAM }, () => Array(constants_1.TAM).fill(null));
}
function randomPlacement() {
    const board = createEmptyBoard();
    const ships = [];
    for (const s of constants_1.SHIPS) {
        let attempts = 0;
        while (attempts < 1000) {
            const orientation = Math.random() < 0.5 ? 'h' : 'v';
            const row = Math.floor(Math.random() * constants_1.TAM);
            const col = Math.floor(Math.random() * constants_1.TAM);
            if (canPlace(board, row, col, s.size, orientation)) {
                const cells = placeShip(board, row, col, s.size, orientation, s.id);
                ships.push({
                    ...s,
                    cells,
                    row,
                    col,
                    orientation,
                });
                break;
            }
            attempts++;
        }
    }
    return { board, ships };
}
function checkAllSunk(ships, attacks) {
    return ships.every((ship) => ship.cells.every((c) => attacks.includes(`${c.r},${c.c}`)));
}
