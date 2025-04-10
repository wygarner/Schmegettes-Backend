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

    if (data?.type == 'getGamesList') {
      console.log('getting games list...');
      ws.send(JSON.stringify({ type: 'gamesList', games }));
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
        const player = {
          id: data.fingerprint,
          name: data.playerName,
          score: 0,
          isTurn: false,
        }
        game.players.push(player)
        ws.send(JSON.stringify({ type: 'joinedGame', gameId: data.gameId, player }));
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
        game.players[0].isTurn = true;
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
        console.log('Clearing clue:', clueId);
        const clue = game.clues.find((c) => c.id === clueId);
        if (clue) {
          clue.active = false;
        }
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'game', game }));
            client.send(JSON.stringify({ type: 'clueSelected', clue, game }));
          }
        });
      }
    }

    if (data?.type == 'updatePlayerScore') {
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        const player = game.players.find((p) => p.id === data.playerId);
        if (player) {
          console.log('Updating score for player:', player.id, data.score);
          player.score += data.score;
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'game', game }));
            }
          });
        }
      }
    }

    if (data?.type == 'endPlayerTurn') {
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        const player = game.players.find((p) => p.id === data.playerId);
        if (player) {
          player.isTurn = false;
          const nextPlayerIndex = (game.players.indexOf(player) + 1) % game.players.length;
          game.players[nextPlayerIndex].isTurn = true;
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'game', game }));
            }
          });
        }
      }
    }

    if (data?.type == 'disqualifyPlayer') {
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        const player = game.players.find((p) => p.id === data.playerId);
        if (player) {
          console.log('Disqualifying player:', player.id);
          player.disqualified = true;
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'game', game }));
            }
          });
        }
      }
    }

    if (data?.type == 'requalifyAllPlayers') {
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        game.players.forEach((player) => {
          player.disqualified = false;
        });
        game.timerInterval = null;
        game.timer = null;
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'game', game }));
          }
        });
      }
    }

    if (data?.type == 'startTimer') {
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        game.timer = data.duration;
        game.playerSpeaking = null;
        const interval = setInterval(() => {
          const timeLeft = game.timer;
          if (timeLeft > 0) game.timer -= 1;
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'game', game }));
            }
          });
          if (timeLeft <= 0) {
            clearInterval(interval);
          }
        }, 1000);
        game.timerInterval = interval;
      }
    }

    if (data?.type == 'pauseTimer') {
      const game = games.find((g) => g.id === data.gameId);
      if (game) {
        game.playerSpeaking = data.playerId;
        clearInterval(game.timerInterval);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'game', game }));
          }
        });
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
