const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from the client/dist directory
app.use(express.static(path.join(__dirname, '../client/dist')));

// Game state
const players = new Map();

// Broadcast game state to all clients
function broadcastGameState() {
  io.emit('playerUpdate', Array.from(players.values()));
}

// Start game loop (20 updates per second)
setInterval(broadcastGameState, 50);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Handle player join
  socket.on('playerJoin', (data) => {
    players.set(socket.id, {
      id: socket.id,
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      state: 'particle', // Initial state
      energy: 100,
      timestamp: Date.now() // Add timestamp for interpolation
    });
    broadcastGameState();
  });

  // Handle player movement
  socket.on('playerMove', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.x = data.x;
      player.y = data.y;
      player.timestamp = Date.now();
      // No need to broadcast here as it's handled by the game loop
    }
  });

  // Handle player attacks
  socket.on('attack', (data) => {
    const attacker = players.get(socket.id);
    if (attacker && attacker.energy > 0) {
      // Broadcast attack to all other players
      socket.broadcast.emit('playerAttack', {
        id: socket.id,
        x: attacker.x,
        y: attacker.y,
        state: attacker.state,
        angle: data.angle,
        timestamp: Date.now()
      });
    }
  });

  // Handle player attacks
  socket.on('playerAttack', (data) => {
    const attacker = players.get(socket.id);
    const target = players.get(data.targetId);
    
    if (attacker && target && attacker.energy > 0) {
      // Apply damage
      target.energy = Math.max(0, target.energy - data.damage);
      
      // Emit attack event to all players
      io.emit('playerAttack', {
        attackerId: socket.id,
        targetId: data.targetId,
        damage: data.damage,
        attackerState: data.attackerState,
        attackAngle: data.angle // Send the attack angle to all players
      });
      
      // Broadcast the updated player states
      io.emit('playerUpdate', Array.from(players.values()));
      
      // If target dies, reset them after 3 seconds
      if (target.energy <= 0) {
        setTimeout(() => {
          if (players.has(data.targetId)) {
            const respawnedPlayer = players.get(data.targetId);
            respawnedPlayer.energy = 100;
            respawnedPlayer.x = Math.random() * 1000;
            respawnedPlayer.y = Math.random() * 1000;
            broadcastGameState();
          }
        }, 3000);
      }
    }
  });

  // Handle state changes
  socket.on('playerStateChange', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.state = data.state;
      player.timestamp = Date.now();
      // Broadcast state changes immediately for responsiveness
      broadcastGameState();
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    players.delete(socket.id);
    broadcastGameState();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
