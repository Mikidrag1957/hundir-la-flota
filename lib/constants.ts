import { ShipDef } from './types'

export const TAM = 10
export const LETTERS = 'ABCDEFGHIJ'

export const SHIPS: ShipDef[] = [
  { name: 'Portaaviones', size: 5, id: 'carrier', color: '#7a8a9a' },
  { name: 'Acorazado', size: 4, id: 'battleship', color: '#5a6a7a' },
  { name: 'Crucero', size: 3, id: 'cruiser', color: '#6a7a8a' },
  { name: 'Submarino', size: 3, id: 'submarine', color: '#3a4a5a' },
  { name: 'Destructor', size: 2, id: 'destroyer', color: '#6a7a6a' },
]

export const WS_PATH = '/ws'
