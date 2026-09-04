import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import stocksRoutes from './routes/stocks.js';
import watchlistsRoutes from './routes/watchlists.js';
import { marketFeed } from './services/marketFeed.js';
import db from './db/index.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/watchlists', watchlistsRoutes);

// Health Check & Telemetry
app.get('/api/health', (req, res) => {
  const stockCount = db.prepare('SELECT COUNT(*) as count FROM stocks_master').get();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Smart Market Watchlist API Engine',
    database: {
      type: 'SQLite (Node.js 22 native DatabaseSync)',
      connected: true,
      masterStocksCount: stockCount.count
    },
    feed: {
      isDelayed: marketFeed.isDelayedFeed,
      activeSubscribers: marketFeed.subscribers.size,
      sequenceId: marketFeed.sequenceId
    }
  });
});

// Setup WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  // console.log(`[WS] Client connected from ${clientIp}. Total: ${wss.clients.size}`);
  
  marketFeed.addSubscriber(ws);

  // Send initial snapshot on connect
  const initialSnapshot = {
    type: 'INITIAL_SNAPSHOT',
    timestamp: Date.now(),
    isDelayed: marketFeed.isDelayedFeed,
    sequenceId: marketFeed.sequenceId,
    indices: marketFeed.indices,
    stocks: marketFeed.getAllStocks().map(s => ({
      symbol: s.symbol,
      last_price: s.last_price,
      change: s.change,
      change_pct: s.change_pct,
      current_volume: s.current_volume,
      volume_z_score: s.volume_z_score,
      sparkline: s.sparkline,
      active_signals: s.active_signals,
      explanation: s.explanation,
      last_updated: s.last_updated
    }))
  };

  ws.send(JSON.stringify(initialSnapshot));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      // ignore invalid json
    }
  });

  ws.on('close', () => {
    marketFeed.removeSubscriber(ws);
    // console.log(`[WS] Client disconnected. Active: ${marketFeed.subscribers.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Client error:', err.message);
    marketFeed.removeSubscriber(ws);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Smart Market Watchlist Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🌐 REST API base: http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});
