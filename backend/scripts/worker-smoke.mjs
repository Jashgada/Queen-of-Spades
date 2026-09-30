import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wranglerEntry = path.join(backendDirectory, 'node_modules/wrangler/bin/wrangler.js');
const origin = 'http://localhost:5173';
const port = 8791;
const baseUrl = `http://127.0.0.1:${port}`;
let worker;

const startWorker = async () => {
  worker = spawn(process.execPath, [wranglerEntry, 'dev', '--ip', '127.0.0.1', '--port', String(port)], {
    cwd: backendDirectory,
    stdio: 'ignore'
  });
  worker.on('error', error => { throw error; });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (worker.exitCode !== null) throw new Error(`Wrangler exited with code ${worker.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Wrangler is still starting.
    }
    await delay(250);
  }
  throw new Error('Wrangler did not become ready');
};

const stopWorker = async () => {
  if (!worker || worker.exitCode !== null) return;
  worker.kill('SIGTERM');
  await Promise.race([once(worker, 'exit'), delay(5_000)]);
  worker = null;
};

const connect = code => new Promise((resolve, reject) => {
  const webSocket = new WebSocket(`ws://127.0.0.1:${port}/ws/${code}`, ['qos.v1']);
  webSocket.events = [];
  webSocket.pending = new Map();
  webSocket.addEventListener('open', () => {
    assert.equal(webSocket.protocol, 'qos.v1');
    resolve(webSocket);
  }, { once: true });
  webSocket.addEventListener('error', () => reject(new Error('WebSocket connection failed')), { once: true });
  webSocket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.type === 'response') {
      const pending = webSocket.pending.get(message.requestId);
      if (!pending) return;
      webSocket.pending.delete(message.requestId);
      clearTimeout(pending.timeout);
      if (message.ok) pending.resolve(message.payload);
      else pending.reject(Object.assign(new Error(message.error.message), { code: message.error.code }));
    } else if (message.type === 'event') {
      webSocket.events.push(message);
    }
  });
});

const send = (webSocket, type, payload = {}) => new Promise((resolve, reject) => {
  const requestId = crypto.randomUUID();
  const timeout = setTimeout(() => {
    webSocket.pending.delete(requestId);
    reject(new Error(`Timed out waiting for ${type}`));
  }, 5_000);
  webSocket.pending.set(requestId, { resolve, reject, timeout });
  webSocket.send(JSON.stringify({ v: 1, type, requestId, payload }));
});

const takeEvent = async (webSocket, name) => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const index = webSocket.events.findIndex(event => event.event === name);
    if (index >= 0) return webSocket.events.splice(index, 1)[0];
    await delay(10);
  }
  throw new Error(`Timed out waiting for event ${name}`);
};

let host;
let guest;
let resumedSocket;

try {
  await startWorker();
  const productionOrigin = 'https://4c4ab488.queen-of-spades.pages.dev';
  const productionOriginPreflight = await fetch(`${baseUrl}/api/rooms`, {
    method: 'OPTIONS',
    headers: { Origin: productionOrigin }
  });
  assert.equal(productionOriginPreflight.status, 204);
  assert.equal(productionOriginPreflight.headers.get('Access-Control-Allow-Origin'), productionOrigin);

  const localOriginPreflight = await fetch(`${baseUrl}/api/rooms`, {
    method: 'OPTIONS',
    headers: { Origin: origin }
  });
  assert.equal(localOriginPreflight.status, 204);
  assert.equal(localOriginPreflight.headers.get('Access-Control-Allow-Origin'), origin);

  const previewOrigin = 'https://test-preview.queen-of-spades.pages.dev';
  const previewPreflight = await fetch(`${baseUrl}/api/rooms`, {
    method: 'OPTIONS',
    headers: { Origin: previewOrigin }
  });
  assert.equal(previewPreflight.status, 204);
  assert.equal(previewPreflight.headers.get('Access-Control-Allow-Origin'), previewOrigin);

  const untrustedOriginPreflight = await fetch(`${baseUrl}/api/rooms`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://queen-of-spades.pages.dev.attacker.invalid' }
  });
  assert.equal(untrustedOriginPreflight.status, 403);

  const allocationResponse = await fetch(`${baseUrl}/api/rooms`, {
    method: 'POST',
    headers: { Origin: productionOrigin }
  });
  assert.equal(allocationResponse.headers.get('Access-Control-Allow-Origin'), productionOrigin);
  const allocation = await allocationResponse.json();
  assert.equal(allocation.success, true);

  host = await connect(allocation.gameCode);
  guest = await connect(allocation.gameCode);
  const created = await send(host, 'game.create', { playerName: 'Host' });
  const joined = await send(guest, 'game.join', { playerName: 'Guest' });
  await takeEvent(host, 'game.playerJoined');
  assert.equal(joined.players.length, 2);

  await send(host, 'game.start');
  const hostHandEvent = await takeEvent(host, 'game.playerState');
  const guestHandEvent = await takeEvent(guest, 'game.playerState');
  await takeEvent(host, 'game.started');
  assert.equal(hostHandEvent.payload.hand.length, 26);
  assert.equal(guestHandEvent.payload.hand.length, 26);

  await assert.rejects(send(guest, 'game.nextDeal'), error => error.code === 'NOT_HOST');
  await send(guest, 'game.pass');
  await takeEvent(host, 'game.biddingUpdated');
  await send(host, 'game.setContract', { partnerCalls: [], cutSuit: 'spades' });
  const contract = await takeEvent(host, 'game.contractSet');

  const playerIds = [created.player.id, joined.player.id];
  const sockets = new Map([[created.player.id, host], [joined.player.id, guest]]);
  const hands = new Map([
    [created.player.id, hostHandEvent.payload.hand],
    [joined.player.id, guestHandEvent.payload.hand]
  ]);
  let currentPlayer = contract.payload.gameState.currentPlayer;
  let trick = [];
  let rounds = 0;

  while (hands.get(playerIds[0]).length + hands.get(playerIds[1]).length > 0) {
    const hand = hands.get(currentPlayer);
    const ledSuit = trick[0]?.card.suit;
    const card = hand.find(candidate => !ledSuit || candidate.suit === ledSuit) || hand[0];
    const result = await send(sockets.get(currentPlayer), 'game.playCard', { card });
    hand.splice(hand.findIndex(candidate => candidate.suit === card.suit && candidate.value === card.value), 1);
    const played = await takeEvent(host, 'game.cardPlayed');
    assert.equal(played.payload.play.playerId, currentPlayer);
    trick.push(played.payload.play);
    currentPlayer = result.nextPlayer;
    if (result.roundComplete) {
      rounds += 1;
      trick = [];
      await takeEvent(host, 'game.roundComplete');
    }
  }

  const dealResult = await takeEvent(host, 'game.over');
  const matchScores = dealResult.payload.matchScores;
  await send(host, 'game.nextDeal');
  const nextHostHand = await takeEvent(host, 'game.playerState');
  const nextGuestHand = await takeEvent(guest, 'game.playerState');
  const restarted = await takeEvent(host, 'game.restarted');
  assert.equal(restarted.payload.gameState.dealNumber, 2);
  assert.deepEqual(restarted.payload.gameState.matchScores, matchScores);
  assert.ok(Object.values(restarted.payload.gameState.scores).every(score => score === 0));
  assert.equal(nextHostHand.payload.hand.length, 26);
  assert.equal(nextGuestHand.payload.hand.length, 26);

  host.close();
  guest.close();
  await Promise.all([once(host, 'close'), once(guest, 'close')]);
  await delay(100);
  await stopWorker();
  await startWorker();

  resumedSocket = await connect(allocation.gameCode);
  const resumed = await send(resumedSocket, 'game.resume', {
    playerId: created.player.id,
    resumeToken: created.player.resumeToken
  });
  assert.equal(resumed.playerId, created.player.id);
  assert.equal(resumed.hand.length, 26);
  assert.equal(resumed.gameState.dealNumber, 2);

  console.log(`Worker WebSocket smoke passed: ${rounds} rounds, second deal, and persisted reconnect for ${allocation.gameCode}`);
} finally {
  for (const webSocket of [host, guest, resumedSocket]) {
    if (webSocket?.readyState < WebSocket.CLOSING) webSocket.close();
  }
  await stopWorker();
}
