# ⚡ PulseWatch — Smart Market Watchlist Platform
> **Groww Code Challenge 2026** | Intelligent Financial Telemetry & Real-Time Watchlist Engine

[![Live Telemetry](https://img.shields.io/badge/Telemetry-500ms%20Live%20Streaming-059669.svg)](#)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-4f46e5.svg)](#)
[![WebSocket](https://img.shields.io/badge/WebSocket-Native%20ws-7c3aed.svg)](#)
[![Database](https://img.shields.io/badge/Database-SQLite%20(Node%2022%20DatabaseSync)-0ea5e9.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-gray.svg)](#)

---

## 🎯 Executive Overview

**PulseWatch** is a next-generation smart market watchlist platform designed for modern Indian equity traders and research analysts. Built to fulfill the **Groww Code Challenge 2026**, PulseWatch moves beyond static ticker lists by streaming live ticks at **500ms intervals**, calculating **statistical volume z-scores**, detecting **sector alpha decoupling**, and tracking benchmark divergence across **NIFTY 50**, **BSE SENSEX**, **NIFTY BANK**, and sectoral indices.

---

## 🚀 Key Differentiating Features

### 1. ⚡ High-Frequency 500ms Live Telemetry
- Sub-second market updates broadcast over high-performance WebSockets (`ws://localhost:3001/ws`).
- Visual micro-flashes (green for upward tick, red for downward tick) with zero full-page repaints.
- In-memory delta compression transmitting only mutated symbols to reduce client network consumption.

### 2. 🧠 Intelligent Anomaly & Catalyst Detection Engine
- **Volume Surge Detection**: Flags any stock whose volume spikes above **+2.0σ** (Z-Score) relative to its 20-day trailing baseline with an actionable lightning tag (`⚡ Surge`).
- **Sector Decoupling**: Identifies divergence where an equity is outperforming or lagging its sectoral benchmark by >1.5%.
- **Earnings Proximity**: Highlights stocks entering a 7-day catalyst window before quarterly disclosures.
- **Dynamic Contextual AI Explanation**: Automated summary sentences for each stock explaining current price movement drivers.

### 3. 🔍 Smart Stock Search & Dynamic Addition (NSE & BSE)
- Real-time search with fuzzy typo-tolerance and alias resolution:
  - `kalyan jewel`, `kaluyna jewel`, `kalyankjil` &rarr; automatically maps to **`KALYANKJIL.NS`** (Kalyan Jewellers India Limited).
  - `sensex`, `bse sensex`, `sensex30` &rarr; automatically maps to **`^BSESN`** (S&P BSE SENSEX).
  - Also supports `RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `TATAMOTORS`, `HUDCO`, and any valid NSE/BSE listed ticker.
- Direct Yahoo Finance live quote sync fetching real-time market cap, P/E, 52-week high/low, and VWAP.

### 4. 📋 Advanced Multi-Watchlist Management
- Create, rename, delete, and switch between customized thematic watchlists (e.g. *High Momentum & Alpha*, *Core Bluechips*, *Tech & Growth Radar*).
- Persistent investment notes and custom tags (`#swing`, `#breakout`, `#longterm`) persisted in SQLite.
- Fast multi-criteria quick filters: **All Stocks**, **Anomalies Only**, **Volume Surges**, **Earnings Proximity**, **Top Gainers**, **Top Losers**.

### 5. 🧪 Evaluator & Judge Toolkit
- **👩‍💻 1-Click Judge Demo Login**: Instant login as *Priya Sharma (Lead Quant / Pro Investor)* with 3 pre-seeded watchlists, notes, and tags.
- **Chaos Simulator Widget**:
  - `⚡ Inject Volume Surge`: Artificially forces a 3.4σ spike on `INFY` to test live anomaly pill reactions.
  - `📉 Flash Pullback`: Injects sector-wide 1.5% dips into Banking & IT.
  - `🔌 Network Drop`: Tests graceful offline degradation, local cached rendering, and telemetry warning badges.

---

## 🏗️ Project Architecture

```
Pulsewatch-smart-market-watchlist/
├── index.html                 # PulseWatch single-page application entrypoint
├── package.json               # Full project dependencies (Express, WS, Vite, Chart.js)
├── vite.config.js             # Vite development server configuration & backend proxy
├── README.md                  # Complete technical & evaluation documentation
├── .gitignore                 # Node modules & build artifacts ignore
│
├── src/                       # Frontend Single-Page Application
│   ├── main.js                # Core telemetry client, WebSocket listener, UI state machine
│   └── style.css              # Custom responsive dark/light styling & micro-animations
│
└── server/                    # Real-Time Telemetry & Backend API Engine
    ├── index.js               # Express REST Server & WebSocket Server (:3001)
    ├── check_live.js          # Live ticker feed verification utility
    ├── test_e2e.js            # End-to-end integration test runner
    ├── db/
    │   └── index.js           # SQLite Native Engine (DatabaseSync) & master stock seeds
    ├── services/
    │   └── marketFeed.js      # 500ms ticker feed generator, anomaly engine & Yahoo sync
    └── routes/
        ├── auth.js            # JWT auth, user registration, and 1-Click Judge Demo login
        ├── stocks.js          # Master stocks, indices, chaos injection, dynamic stock add
        └── watchlists.js      # Multi-watchlist CRUD, reordering, custom notes & tags
```

---

## 🗄️ Database Schema (SQLite Native)

Built on Node.js 22's native `DatabaseSync` engine for zero external C++ native build dependencies:

```sql
-- Users & Investor Profiles
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_initials TEXT DEFAULT 'PS',
  experience_level TEXT,
  preferred_sectors TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Master Stock Universe
CREATE TABLE stocks_master (
  symbol TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  industry TEXT,
  market_cap_cr REAL,
  base_price REAL NOT NULL,
  pe_ratio REAL,
  pb_ratio REAL,
  dividend_yield REAL,
  roe_pct REAL,
  debt_to_equity REAL,
  analyst_buy_pct INTEGER,
  analyst_hold_pct INTEGER,
  analyst_sell_pct INTEGER,
  fifty_two_week_high REAL,
  fifty_two_week_low REAL,
  avg_volume_20d INTEGER,
  next_earnings_date TEXT,
  sector_benchmark TEXT,
  beta REAL
);

-- User Watchlists
CREATE TABLE watchlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Watchlist Items & Analyst Notes
CREATE TABLE watchlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watchlist_id INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  custom_tags TEXT DEFAULT '[]',
  alert_price_high REAL,
  alert_price_low REAL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
  FOREIGN KEY (symbol) REFERENCES stocks_master(symbol) ON DELETE CASCADE,
  UNIQUE(watchlist_id, symbol)
);
```

---

## 📡 REST API & WebSocket Reference

### Authentication
- `POST /api/auth/register` &mdash; Create a new investor profile with experience level and sector chips.
- `POST /api/auth/login` &mdash; Authenticate with email and password.
- `GET /api/auth/demo` &mdash; Instant 1-Click evaluator access as Priya Sharma.

### Stocks & Market Telemetry
- `GET /api/stocks` &mdash; Retrieve master stocks with current prices, VWAP, and active anomalies.
- `GET /api/stocks/indices` &mdash; Retrieve live market benchmarks (`NIFTY 50`, `BSE SENSEX`, `NIFTY BANK`, etc.).
- `GET /api/stocks/signals` &mdash; Filter active market anomalies (volume surges, earnings proximity).
- `GET /api/stocks/:symbol` &mdash; Full stock breakdown including relative alpha and analyst sentiment.
- `POST /api/stocks/add` &mdash; Dynamically resolve and register any NSE/BSE stock or index with live data.

### Watchlists
- `GET /api/watchlists` &mdash; Fetch all watchlists for authenticated user with live telemetry merged.
- `POST /api/watchlists` &mdash; Create a new watchlist.
- `POST /api/watchlists/:id/items` &mdash; Add a stock to a watchlist.
- `DELETE /api/watchlists/:id/items/:symbol` &mdash; Remove a stock from a watchlist.
- `PUT /api/watchlists/:id/items/:symbol/notes` &mdash; Save custom research notes and tags.
- `PUT /api/watchlists/:id/reorder` &mdash; Persist custom item display order.

### Chaos Simulation (Judge Testing)
- `POST /api/stocks/simulation/chaos` &mdash; Triggers volume spikes, market dips, or offline delay toggling.

### WebSocket Feed
- **Endpoint**: `ws://localhost:3001/ws`
- **Initial Handshake**: Emits `INITIAL_SNAPSHOT` with full indices and stock data.
- **Tick Stream**: Emits `MARKET_TICK` every 500ms containing only updated tickers and latency markers.

---

## ⚡ Quickstart Guide (Run Locally)

### 1. Clone the Repository
```bash
git clone https://github.com/keerthanagunisetty/Pulsewatch-smart-market-watchlist.git
cd Pulsewatch-smart-market-watchlist
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Backend & Real-Time Feed (:3001)
```bash
node server/index.js
```

### 4. In a New Terminal, Start Frontend (:5173)
```bash
npm run dev
```

### 5. Open in Browser
Navigate to **`http://localhost:5173`**
- Click **"🚀 1-Click Judge Demo Login"** to start exploring immediately!
