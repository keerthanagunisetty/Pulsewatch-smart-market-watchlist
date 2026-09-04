# Hackathon Project Submission Details

Use the exact content below to fill in your hackathon submission form.

---

### **Title**
```text
PulseWatch — Intelligent Market Watchlist & Meaningful Change Engine
```

---

### **Description**
```markdown
### 📌 Executive Summary
Most retail market watchlists act like passive digital spreadsheets: overwhelming users with raw numbers and ticker fatigue. **PulseWatch** is a next-generation, high-performance financial intelligence platform designed for the modern investor. It transforms raw tick telemetry into contextual, actionable intelligence by surfacing **what** changed, **why** it matters, and **how confident** the system is in the data.

---

### 💡 The Problem
- **Information Overload & Ticker Fatigue**: Continuous red/green fluctuations create panic without context. A 3% dip is normal if the entire sector dropped 4%, but critical if accompanied by 5x volume spikes.
- **Naive Percentage Deltas**: Standard watchlists do not distinguish between statistical noise and true structural catalysts.
- **Fragile Data Feeds**: Traditional apps crash or display misleading numbers when market feeds lag, drop, or become desynchronized.

---

### 🚀 Key Features & Engineering Highlights
1. **Real-Time 500ms Market Telemetry & Sparklines**:
   - Sub-second tick ingestion via high-throughput WebSocket stream with instant fallback to client-side mathematical simulation.
   - Micro-sparklines for instant intraday trend trajectory recognition.

2. **Meaningful Change Detection Engine**:
   - **Volume Anomaly Detection (Z-Score > 2.0σ)**: Statistically identifies institutional accumulation or distribution vs 20-day rolling baseline.
   - **Sector Alpha Decoupling**: Dynamically benchmarks stock movements against sector peers (NIFTY IT, NIFTY BANK, NIFTY ENERGY) to isolate company-specific momentum from broader market tides.
   - **Catalyst Proximity Windows**: Alerts investors when earnings releases or corporate actions fall within critical decision windows.
   - **Plain-English Explanations**: Translates quantitative events into glanceable human insights (e.g., *"Infosys surged +2.7% backed by abnormal 2.8σ volume ahead of quarterly disclosure"*).

3. **Multi-Watchlist & Persistent State Architecture**:
   - Create custom thematic portfolios (e.g., *High Momentum & Alpha*, *Core Nifty Bluechips*, *Tech & Growth Radar*).
   - Write and persist personal research notes and custom tags stored in SQLite database.

4. **Fault-Tolerant "Zero-Downtime" Reliability**:
   - **Visual Data Freshness Indicators**: Explicit badges (`LIVE`, `DELAYED`, `OFFLINE`) and latency telemetry to maintain user trust during market turbulence.
   - **Transparent Fallback Simulation**: Dual-engine architecture automatically switches between backend Express/WebSocket and in-browser client engine so evaluators experience uninterrupted interaction on any device or hosting environment.
   - **Chaos Simulator for Evaluators**: Interactive panel to simulate volume surges, sector flash dips, and feed staleness on demand.

---

### 🛠️ Technology Stack & Architecture
- **Frontend**: Vanilla JavaScript (ES Modules), CSS3 Design System with clean financial typography (Inter & JetBrains Mono), responsive CSS Grid/Flexbox, light & dark theme persistence.
- **Backend**: Node.js, Express 5.x REST API, native WebSocket (`ws`), SQLite with WAL mode persistence.
- **Security & Auth**: Bcrypt password hashing, JWT session tokens, 1-Click Judge Demo authentication.
- **Deployment**: Vercel-ready with single-page application routing (`vercel.json`) and zero-configuration build pipeline.
```

---

### **Theme**
```text
FinTech / Web Development / Smart Market Watchlist (Groww Code Challenge)
```

---

### **Snapshots**
```text
Upload the screenshots showing the following screens:
1. Login & Registration Screen (featuring the 1-Click Judge Demo Login button).
2. Main Watchlist Dashboard (highlighting live prices, sparklines, and active smart signal badges like 'Volume Surge +2.7σ').
3. Meaningful Change & Telemetry Drawer (showing sector alpha decoupling and plain-English catalyst analysis).
4. Chaos Simulator & Dark Mode (demonstrating system resilience and theme toggle).
```

---

### **Video URL**
```text
https://pulsewatch-smart-market-watchlist-r.vercel.app/
(Or paste your recorded Loom / YouTube demo video link if available)
```

---

### **Demo Link**
```text
https://pulsewatch-smart-market-watchlist-r.vercel.app/
```

---

### **Repository URL**
```text
https://github.com/keerthanagunisetty/Pulsewatch-smart-market-watchlist.git
```

---

### **Source Code**
```text
Upload the provided pre-packaged zip file:
PulseWatch-SourceCode.zip (Location: root directory of project, ~126 KB)
```

---

### **Instructions to Run**
```markdown
### Method 1: Instant Cloud Demo (No Installation Required)
1. Open the live deployment link: **https://pulsewatch-smart-market-watchlist-r.vercel.app/**
2. Click the **"🚀 1-Click Judge Demo Login"** button at the top of the login card.
3. You will be instantly logged in as Judge Priya Sharma with 3 pre-seeded watchlists, live 500ms ticker updates, and analytics.

---

### Method 2: Running Locally from Source

#### Prerequisites
- Node.js (v18 or higher; Node v20/v22 recommended)
- npm

#### Step-by-Step Commands:
1. **Clone the repository**:
   ```bash
   git clone https://github.com/keerthanagunisetty/Pulsewatch-smart-market-watchlist.git
   cd Pulsewatch-smart-market-watchlist
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   - **Option A (Full-Stack Production Server)**:
     ```bash
     npm run build
     npm start
     ```
     Access the complete app with backend API, SQLite database, and WebSocket at: **http://localhost:3001**

   - **Option B (Vite Development Mode)**:
     ```bash
     npm run dev:server    # Terminal 1 (starts Node/WebSocket backend on port 3001)
     npm run dev:client    # Terminal 2 (starts Vite frontend on port 5173)
     ```
     Open **http://localhost:5173** in your browser.

4. **Log in to evaluate**:
   - Use the **1-Click Judge Demo Login** button, or log in with:
     - **Email**: `demo@groww.in`
     - **Password**: `groww123`
   - Alternatively, register a brand-new investor account using the registration tab.
```
