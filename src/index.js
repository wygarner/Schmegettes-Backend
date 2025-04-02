const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

let games = []; // Store active games

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send existing games to new client
  ws.send(JSON.stringify({ type: 'gamesList', games }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'createGame') {
      const newGame = { id: `${games.length + 1}`, name: `Game ${games.length + 1}` };
      games.push(newGame);

      // Broadcast updated game list to all clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'gamesList', games }));
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
