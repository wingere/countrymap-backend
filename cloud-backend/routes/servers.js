const express = require('express');
const crypto = require('crypto');
const Server = require('../models/Server');
const router = express.Router();

// Generate unique server ID and token
function generateServerCredentials() {
  const serverId = crypto.randomBytes(16).toString('hex');
  const serverToken = crypto.randomBytes(32).toString('hex');
  return { serverId, serverToken };
}

// Register new server
router.post('/register', async (req, res) => {
  try {
    const { serverName, description, worldName, maxPlayers } = req.body;
    
    if (!serverName) {
      return res.status(400).json({ error: 'Server name is required' });
    }
    
    const { serverId, serverToken } = generateServerCredentials();
    const webMapUrl = `${process.env.FRONTEND_URL || 'https://countrymap.vercel.app'}/server/${serverId}`;
    
    const server = new Server({
      serverId,
      serverName,
      description: description || '',
      webMapUrl,
      serverToken,
      worldName: worldName || 'world',
      maxPlayers: maxPlayers || 20,
      status: 'online'
    });
    
    await server.save();
    
    res.json({
      success: true,
      serverId,
      serverToken,
      webMapUrl,
      message: 'Server registered successfully'
    });
    
    console.log(`New server registered: ${serverName} (${serverId})`);
  } catch (error) {
    console.error('Server registration error:', error);
    res.status(500).json({ error: 'Failed to register server' });
  }
});

// Sync server data
router.post('/:serverId/sync', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { serverToken, countries, players, wars } = req.body;
    
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    if (server.serverToken !== serverToken) {
      return res.status(401).json({ error: 'Invalid server token' });
    }
    
    // Update server data
    if (countries) server.countries = countries;
    if (players) server.players = players;
    if (wars) server.wars = wars;
    
    await server.updateLastSeen();
    
    // Broadcast updates to connected clients
    if (global.io) {
      global.io.to(`server-${serverId}`).emit('data-update', {
        countries: server.countries,
        players: server.players,
        wars: server.wars,
        timestamp: new Date()
      });
    }
    
    res.json({ success: true, message: 'Data synchronized' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Get server data
router.get('/:serverId/data', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.json({
      serverInfo: {
        serverId: server.serverId,
        serverName: server.serverName,
        description: server.description,
        worldName: server.worldName,
        status: server.status,
        lastSeen: server.lastSeen,
        playerCount: server.players.filter(p => p.online).length,
        countryCount: server.countries.length
      },
      countries: server.countries,
      players: server.players,
      wars: server.wars
    });
  } catch (error) {
    console.error('Get data error:', error);
    res.status(500).json({ error: 'Failed to get server data' });
  }
});

// Get server countries
router.get('/:serverId/countries', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.json({ countries: server.countries });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ error: 'Failed to get countries' });
  }
});

// Get server players
router.get('/:serverId/players', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.json({ players: server.players });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ error: 'Failed to get players' });
  }
});

// Get server wars
router.get('/:serverId/wars', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.json({ wars: server.wars });
  } catch (error) {
    console.error('Get wars error:', error);
    res.status(500).json({ error: 'Failed to get wars' });
  }
});

// Send real-time update
router.post('/:serverId/update', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { serverToken, type, data } = req.body;
    
    const server = await Server.findOne({ serverId });
    if (!server || server.serverToken !== serverToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Broadcast real-time update
    if (global.io) {
      global.io.to(`server-${serverId}`).emit('real-time-update', {
        type,
        data,
        timestamp: new Date()
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Real-time update error:', error);
    res.status(500).json({ error: 'Failed to send update' });
  }
});

module.exports = router;