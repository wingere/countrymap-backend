# CountryProtect WebMap - Cloud Backend

Cloud backend for CountryProtect WebMap system, deployed on Heroku.

## Features

- Server registration and management
- Real-time data synchronization
- Player skin processing and storage
- WebSocket support for live updates
- MongoDB Atlas integration
- RESTful API endpoints

## API Endpoints

### Server Management
- `POST /api/servers/register` - Register new Minecraft server
- `POST /api/servers/:id/sync` - Sync server data
- `GET /api/servers/:id/data` - Get all server data
- `GET /api/servers/:id/countries` - Get countries data
- `GET /api/servers/:id/players` - Get players data
- `GET /api/servers/:id/wars` - Get wars data
- `POST /api/servers/:id/update` - Send real-time update

### Skin Management
- `POST /api/skins/:username/upload` - Upload player skin
- `POST /api/skins/:username/download` - Auto-download skin from APIs
- `GET /skins/:username/head.png` - Get player head image (32x32)
- `GET /skins/:username/front.png` - Get player front view (64x64)

## Environment Variables

```env
MONGODB_URI=mongodb+srv://...
FRONTEND_URL=https://countrymap.vercel.app
PORT=3000
MINOTAR_API_URL=https://minotar.net
CRAFATAR_API_URL=https://crafatar.com
MCHEADS_API_URL=https://mc-heads.net
```

## Deployment to Heroku

1. Create Heroku app:
```bash
heroku create countrymap-backend
```

2. Set environment variables:
```bash
heroku config:set MONGODB_URI="your-mongodb-uri"
heroku config:set FRONTEND_URL="https://countrymap.vercel.app"
```

3. Deploy:
```bash
git add .
git commit -m "Initial backend deployment"
git push heroku main
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

## WebSocket Events

### Client to Server
- `join-server` - Join server room for updates

### Server to Client
- `data-update` - Full data synchronization
- `real-time-update` - Individual updates (player movement, etc.)

## Database Schema

### Server Document
```javascript
{
  serverId: String,
  serverName: String,
  webMapUrl: String,
  serverToken: String,
  status: 'online' | 'offline',
  countries: [...],
  players: [...],
  wars: [...]
}
```