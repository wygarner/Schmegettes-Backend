const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', (message) => {
    console.log('received: %s', message);
    ws.send('Hello from server!');
  });
});

app.get('/', (req, res) => {
  res.send('WebSocket server is running!');
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server is running...');
});
