import { GameRoom } from './models/GameRoom';

interface Env {
  GAME_ROOMS: DurableObjectNamespace<GameRoom>;
  ALLOWED_ORIGIN?: string;
}

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

export { GameRoom };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const allowedOrigin = env.ALLOWED_ORIGIN || (isLocal ? 'http://localhost:5173' : undefined);
    const corsHeaders: Record<string, string> = {};
    if (origin && origin === allowedOrigin) {
      Object.assign(corsHeaders, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin'
      });
    }

    if (request.method === 'OPTIONS' && url.pathname === '/api/rooms') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (origin && (!allowedOrigin || origin !== allowedOrigin)) {
      return Response.json({ success: false, message: 'Origin is not allowed' }, { status: 403 });
    }

    if (url.pathname === '/health') {
      return Response.json({ success: true, service: 'queen-of-spades-worker' });
    }

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const gameCode = generateRoomCode();
        const room = env.GAME_ROOMS.getByName(gameCode);
        const reserveUrl = new URL('/internal/reserve', request.url);
        const reservation = await room.fetch(new Request(reserveUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: gameCode })
        }));

        if (reservation.status === 409) continue;
        if (!reservation.ok) {
          return Response.json({ success: false, message: 'Could not allocate a room' }, {
            status: 500,
            headers: corsHeaders
          });
        }
        return Response.json({ success: true, gameCode }, { headers: corsHeaders });
      }
      return Response.json({ success: false, message: 'Could not allocate a unique room code' }, {
        status: 503,
        headers: corsHeaders
      });
    }

    const roomMatch = url.pathname.match(/^\/ws\/([A-Z0-9]{6})$/i);
    if (roomMatch && request.method === 'GET') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected a WebSocket upgrade', { status: 426 });
      }
      const gameCode = roomMatch[1].toUpperCase();
      const room = env.GAME_ROOMS.getByName(gameCode);
      const roomUrl = new URL('/ws', request.url);
      roomUrl.searchParams.set('roomCode', gameCode);
      return room.fetch(new Request(roomUrl, request));
    }

    return Response.json({ success: false, message: 'Not found' }, { status: 404 });
  }
};

function generateRoomCode(): string {
  const values = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(values, value => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length]).join('');
}
