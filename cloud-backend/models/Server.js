const mongoose = require('mongoose');

const ServerSchema = new mongoose.Schema({
  serverId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  serverName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  webMapUrl: {
    type: String,
    required: true
  },
  serverToken: {
    type: String,
    required: true
  },
  worldName: {
    type: String,
    default: 'world'
  },
  maxPlayers: {
    type: Number,
    default: 20
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Current game data
  countries: [{
    name: String,
    president: String,
    members: [String],
    territory: {
      world: String,
      minX: Number,
      minZ: Number,
      maxX: Number,
      maxZ: Number
    },
    color: String,
    atWar: [String],
    warScores: Map
  }],
  players: [{
    name: String,
    uuid: String,
    country: String,
    location: {
      world: String,
      x: Number,
      y: Number,
      z: Number
    },
    online: Boolean,
    isPresident: Boolean,
    skinHeadUrl: String,
    skinFrontUrl: String,
    hasSkin: Boolean,
    lastUpdate: Date
  }],
  wars: [{
    country1: String,
    country2: String,
    startTime: Date,
    scores: Map,
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active'
    }
  }]
}, {
  timestamps: true
});

// Indexes for performance
ServerSchema.index({ serverId: 1 });
ServerSchema.index({ status: 1 });
ServerSchema.index({ lastSeen: -1 });

// Methods
ServerSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  this.status = 'online';
  return this.save();
};

ServerSchema.methods.setOffline = function() {
  this.status = 'offline';
  return this.save();
};

module.exports = mongoose.model('Server', ServerSchema);