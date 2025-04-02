const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Player connected');

  socket.on('playerMove', (data) => {
    console.log('Move:', data);
    io.emit('updateGameState', { message: 'Game updated!' });
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected');
  });
});

server.listen(3000, () => {
  console.log('WebSocket server running on port 3000');
});
