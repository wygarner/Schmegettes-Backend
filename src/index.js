const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let games = []; // Store active games

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.send(JSON.stringify({ type: 'gamesList', games }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Received message:', data);

    if (data?.type == 'createGame') {
      const gameId = Math.random().toString(36).substring(2, 15);
      games.push({ id: gameId, players: [] });
      ws.send(JSON.stringify({ type: 'gameCreated', gameId }));
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'gamesList', games }));
        }
      });
    }

    if (data?.type == 'getGame') {
      console.log('getting game...');
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        ws.send(JSON.stringify({ type: 'game', game }));
      }
    }

    if (data?.type == 'joinGame') {
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        const playerID = Math.random().toString(36).substring(2, 15);
        game.players.push({
          id: playerID,
          name: data.playerName,
          score: 0,
        })
        ws.send(JSON.stringify({ type: 'joinedGame', gameId: data.gameId }));
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'game', game }));
          }
        });
      }
    }

    if (data?.type == 'startGame') {
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        game.active = true;
        game.clues = data.clues;
        game.activeRound = 1;
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'gameStarted', gameId: data.gameId }));
          }
        });
      }
    }

    if (data?.type == 'clearClue') {
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        const { clueId } = data;
        game.clues = game.clues.filter((clue) => clue.id !== clueId);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'game', game }));
          }
        });
      }
    }

    if (data?.type == 'updatePlayerScore') {
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        const player = game.players.find((p) => p.id === data.playerId);
        if (player) {
          player.score += data.score;
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'game', game }));
            }
          });
        }
      }
    }

  });
});

app.get('/', (req, res) => {
  res.send('WebSocket server is running!');
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server is running...');
});
