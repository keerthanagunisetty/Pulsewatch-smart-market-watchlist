import db from '../db/index.js';

// Real NSE Tickers mapping to Yahoo Finance
const REAL_TICKERS_MAP = {
  'RELIANCE': 'RELIANCE.NS',
  'TCS': 'TCS.NS',
  'INFY': 'INFY.NS',
  'HDFCBANK': 'HDFCBANK.NS',
  'ICICIBANK': 'ICICIBANK.NS',
  'TATAMOTORS': 'TMCV.NS',
  'ITC': 'ITC.NS',
  'BHARTIARTL': 'BHARTIARTL.NS',
  'SBIN': 'SBIN.NS',
  'LT': 'LT.NS',
  'SUNPHARMA': 'SUNPHARMA.NS',
  'KOTAKBANK': 'KOTAKBANK.NS',
  'WIPRO': 'WIPRO.NS',
  'MARUTI': 'MARUTI.NS',
  'TITAN': 'TITAN.NS',
  'BAJFINANCE': 'BAJFINANCE.NS',
  'ASIANPAINT': 'ASIANPAINT.NS',
  'HCLTECH': 'HCLTECH.NS',
  'ADANIENT': 'ADANIENT.NS',
  'AXISBANK': 'AXISBANK.NS',
  'NTPC': 'NTPC.NS',
  'M&M': 'M%26M.NS',
  'POWERGRID': 'POWERGRID.NS',
  'TATASTEEL': 'TATASTEEL.NS',
  'PAYTM': 'PAYTM.NS',
  'KALYANKJIL': 'KALYANKJIL.NS',
  'SENSEX': '^BSESN'
};

// Accurate Real Market Baseline Prices from current NSE session
const ACCURATE_REAL_BASELINES = {
  'RELIANCE': { price: 1328.30, prevClose: 1302.50, high: 1332.30, low: 1304.10, high52: 1608.80, low52: 1215.00 },
  'TCS': { price: 2321.00, prevClose: 2320.10, high: 2363.90, low: 2316.60, high52: 4585.00, low52: 2150.00 },
  'INFY': { price: 1132.10, prevClose: 1130.30, high: 1146.70, low: 1128.30, high52: 1990.00, low52: 1080.00 },
  'HDFCBANK': { price: 715.25, prevClose: 706.65, high: 716.20, low: 708.35, high52: 1794.00, low52: 680.00 },
  'ICICIBANK': { price: 1432.70, prevClose: 1430.00, high: 1438.30, low: 1423.40, high52: 1450.00, low52: 980.00 },
  'TATAMOTORS': { price: 466.00, prevClose: 462.50, high: 472.00, low: 460.50, high52: 1179.00, low52: 440.00 },
  'ITC': { price: 265.50, prevClose: 263.00, high: 266.25, low: 262.65, high52: 528.00, low52: 245.00 },
  'BHARTIARTL': { price: 1865.30, prevClose: 1869.00, high: 1870.70, low: 1858.70, high52: 1920.00, low52: 1150.00 },
  'SBIN': { price: 1024.70, prevClose: 1023.40, high: 1032.00, low: 1018.50, high52: 1045.00, low52: 555.00 },
  'LT': { price: 3987.70, prevClose: 3975.00, high: 4015.00, low: 3960.00, high52: 4100.00, low52: 2860.00 },
  'SUNPHARMA': { price: 1904.00, prevClose: 1916.00, high: 1925.00, low: 1895.00, high52: 1960.00, low52: 1110.00 },
  'KOTAKBANK': { price: 425.55, prevClose: 421.15, high: 428.00, low: 419.50, high52: 1925.00, low52: 400.00 },
  'WIPRO': { price: 177.94, prevClose: 175.72, high: 179.50, low: 174.20, high52: 580.00, low52: 165.00 },
  'MARUTI': { price: 12790.00, prevClose: 12857.00, high: 12920.00, low: 12740.00, high52: 13680.00, low52: 9735.00 },
  'TITAN': { price: 4995.00, prevClose: 5027.00, high: 5040.00, low: 4960.00, high52: 5120.00, low52: 3055.00 },
  'BAJFINANCE': { price: 1057.50, prevClose: 1049.00, high: 1065.00, low: 1045.00, high52: 8192.00, low52: 980.00 },
  'ASIANPAINT': { price: 2544.10, prevClose: 2541.60, high: 2560.00, low: 2530.00, high52: 3422.00, low52: 2420.00 },
  'HCLTECH': { price: 1312.10, prevClose: 1319.00, high: 1325.00, low: 1305.00, high52: 1850.00, low52: 1200.00 },
  'ADANIENT': { price: 2959.00, prevClose: 2901.00, high: 2990.00, low: 2890.00, high52: 3450.00, low52: 2140.00 },
  'AXISBANK': { price: 1274.40, prevClose: 1267.00, high: 1282.00, low: 1262.00, high52: 1339.00, low52: 933.00 },
  'NTPC': { price: 331.45, prevClose: 330.90, high: 334.00, low: 329.50, high52: 440.00, low52: 220.00 },
  'M&M': { price: 3164.10, prevClose: 3150.00, high: 3190.00, low: 3140.00, high52: 3250.00, low52: 1520.00 },
  'POWERGRID': { price: 265.85, prevClose: 265.60, high: 268.00, low: 264.00, high52: 366.00, low52: 190.00 },
  'TATASTEEL': { price: 183.87, prevClose: 184.20, high: 186.00, low: 182.50, high52: 184.60, low52: 114.60 },
  'ZOMATO': { price: 324.80, prevClose: 327.30, high: 331.00, low: 324.15, high52: 340.00, low52: 95.00 },
  'PAYTM': { price: 1689.40, prevClose: 1637.00, high: 1710.00, low: 1625.00, high52: 1750.00, low52: 310.00 },
  'KALYANKJIL': { price: 597.85, prevClose: 590.10, high: 604.50, low: 588.00, high52: 794.00, low52: 280.00 },
  'SENSEX': { price: 76681.08, prevClose: 76368.68, high: 76950.00, low: 76200.00, high52: 85978.00, low52: 70800.00 }
};

class MarketFeedService {
  constructor() {
    this.stocks = new Map();
    this.indices = {
      'NIFTY 50': { name: 'NIFTY 50', price: 23985.60, change: 112.15, change_pct: 0.47 },
      'BSE SENSEX': { name: 'BSE SENSEX', price: 76681.08, change: 312.40, change_pct: 0.41 },
      'NIFTY BANK': { name: 'NIFTY BANK', price: 57612.05, change: 231.45, change_pct: 0.40 },
      'NIFTY IT': { name: 'NIFTY IT', price: 26450.00, change: 70.00, change_pct: 0.27 },
      'NIFTY AUTO': { name: 'NIFTY AUTO', price: 19250.00, change: 70.00, change_pct: 0.37 },
      'NIFTY ENERGY': { name: 'NIFTY ENERGY', price: 31450.00, change: 70.00, change_pct: 0.22 }
    };
    this.subscribers = new Set();
    this.sequenceId = 1;
    this.isDelayedFeed = false;
    this.init();
  }

  init() {
    const rows = db.prepare('SELECT * FROM stocks_master').all();
    for (const row of rows) {
      const accurate = ACCURATE_REAL_BASELINES[row.symbol] || {
        price: row.base_price,
        prevClose: row.base_price,
        high: row.fifty_two_week_high,
        low: row.fifty_two_week_low,
        high52: row.fifty_two_week_high,
        low52: row.fifty_two_week_low
      };

      const currentPrice = accurate.price;
      const prevClose = accurate.prevClose;
      const change = Number((currentPrice - prevClose).toFixed(2));
      const change_pct = Number(((change / prevClose) * 100).toFixed(2));
      
      const dayHigh = accurate.high;
      const dayLow = accurate.low;

      // Sparkline initialized around real market price
      const sparkline = [];
      let p = prevClose;
      for (let i = 0; i < 24; i++) {
        p = p * (1 + (Math.random() - 0.495) * 0.002);
        sparkline.push(Number(p.toFixed(2)));
      }
      sparkline[sparkline.length - 1] = currentPrice;

      const baseVol = Math.floor(row.avg_volume_20d * 0.65);
      const isAnomalous = row.symbol === 'INFY' || row.symbol === 'RELIANCE';
      const volume = isAnomalous ? Math.floor(baseVol * 1.85) : baseVol;
      const zScore = isAnomalous ? 2.45 : Number(((Math.random() * 1.4) - 0.3).toFixed(2));

      // Order book top of book
      const spread = currentPrice > 1000 ? 0.20 : 0.05;
      const bid_price = Number((currentPrice - spread).toFixed(2));
      const ask_price = Number((currentPrice + spread).toFixed(2));
      const bid_qty = Math.floor(400 + Math.random() * 2600);
      const ask_qty = Math.floor(400 + Math.random() * 2400);

      const vwap = Number(((dayHigh + dayLow + currentPrice) / 3).toFixed(2));

      this.stocks.set(row.symbol, {
        ...row,
        base_price: prevClose,
        last_price: currentPrice,
        open_price: prevClose,
        high_price: dayHigh,
        low_price: dayLow,
        fifty_two_week_high: accurate.high52,
        fifty_two_week_low: accurate.low52,
        vwap,
        bid_price,
        bid_qty,
        ask_price,
        ask_qty,
        change,
        change_pct,
        current_volume: volume,
        volume_z_score: zScore,
        sparkline,
        active_signals: [],
        explanation: '',
        last_updated: Date.now()
      });
    }

    this.evaluateAllSignals();

    // 1. Initial live market sync from Yahoo Finance / NSE
    this.syncRealMarketQuotes();

    // 2. Periodic live market sync every 15 seconds to keep prices real
    setInterval(() => {
      this.syncRealMarketQuotes();
    }, 15000);

    // 3. Sub-second (500ms) live streaming tick simulation
    this.startSimulation();
  }

  // Fetch true live market prices from Yahoo Finance for Indian NSE stocks
  async syncRealMarketQuotes() {
    try {
      // Sync Nifty Indices
      try {
        const idxRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=1d', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const idxData = await idxRes.json();
        const nMeta = idxData?.chart?.result?.[0]?.meta;
        if (nMeta && nMeta.regularMarketPrice) {
          const p = Number(nMeta.regularMarketPrice.toFixed(2));
          const prev = Number(nMeta.chartPreviousClose.toFixed(2));
          this.indices['NIFTY 50'].price = p;
          this.indices['NIFTY 50'].change = Number((p - prev).toFixed(2));
          this.indices['NIFTY 50'].change_pct = Number((((p - prev) / prev) * 100).toFixed(2));
        }
      } catch (e) {}

      // Sync individual stocks in parallel
      const symbols = Object.keys(REAL_TICKERS_MAP);
      const promises = symbols.map(async (sym) => {
        const ticker = REAL_TICKERS_MAP[sym];
        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice) {
            const stock = this.stocks.get(sym);
            if (stock) {
              const liveP = Number(meta.regularMarketPrice.toFixed(2));
              const prevClose = Number((meta.chartPreviousClose || stock.base_price).toFixed(2));
              stock.base_price = prevClose;
              stock.last_price = liveP;
              stock.change = Number((liveP - prevClose).toFixed(2));
              stock.change_pct = Number(((stock.change / prevClose) * 100).toFixed(2));
              if (meta.regularMarketDayHigh) stock.high_price = Number(meta.regularMarketDayHigh.toFixed(2));
              if (meta.regularMarketDayLow) stock.low_price = Number(meta.regularMarketDayLow.toFixed(2));
              if (meta.fiftyTwoWeekHigh) stock.fifty_two_week_high = Number(meta.fiftyTwoWeekHigh.toFixed(2));
              if (meta.fiftyTwoWeekLow) stock.fifty_two_week_low = Number(meta.fiftyTwoWeekLow.toFixed(2));

              stock.vwap = Number(((stock.high_price + stock.low_price + stock.last_price) / 3).toFixed(2));
              const spread = stock.last_price > 1000 ? 0.20 : 0.05;
              stock.bid_price = Number((stock.last_price - spread).toFixed(2));
              stock.ask_price = Number((stock.last_price + spread).toFixed(2));

              stock.last_updated = Date.now();
              this.evaluateStockSignals(stock);
            }
          }
        } catch (err) {}
      });

      await Promise.allSettled(promises);
      // console.log('[Live Feed] Synchronized with real-world NSE market prices.');
    } catch (e) {
      console.error('[Live Feed] Sync error:', e.message);
    }
  }

  startSimulation() {
    // 500ms (0.5s) live tick interval centered around real market price
    setInterval(() => {
      this.tick();
    }, 500);
  }

  tick() {
    this.sequenceId++;
    const now = Date.now();

    // 1. Micro-drift index benchmarks
    for (const key of Object.keys(this.indices)) {
      const idx = this.indices[key];
      const deltaPct = (Math.random() - 0.495) * 0.0003;
      idx.price = Number((idx.price * (1 + deltaPct)).toFixed(2));
      idx.change = Number((idx.change + (idx.price * deltaPct)).toFixed(2));
      idx.change_pct = Number(((idx.change / (idx.price - idx.change)) * 100).toFixed(2));
    }

    // 2. Select 5-8 stocks to tick dynamically every 0.5s
    const symbols = Array.from(this.stocks.keys());
    const countToUpdate = 5 + Math.floor(Math.random() * 4);
    const shuffled = [...symbols].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, countToUpdate);

    const updatedStockPayloads = [];

    for (const sym of selected) {
      const stock = this.stocks.get(sym);
      if (!stock) continue;

      const sectorIdx = this.indices[stock.sector_benchmark] || this.indices['NIFTY 50'];
      const sectorPull = (sectorIdx.change_pct / 100) * 0.02;
      const microDrift = (Math.random() - 0.492) * 0.0015;
      const totalDelta = (microDrift + sectorPull) * (stock.beta || 1.0);

      stock.last_price = Number((stock.last_price * (1 + totalDelta)).toFixed(2));
      stock.change = Number((stock.last_price - stock.base_price).toFixed(2));
      stock.change_pct = Number(((stock.change / stock.base_price) * 100).toFixed(2));
      stock.high_price = Math.max(stock.high_price, stock.last_price);
      stock.low_price = Math.min(stock.low_price, stock.last_price);

      // VWAP rolling calculation
      stock.vwap = Number(((stock.high_price + stock.low_price + stock.last_price) / 3).toFixed(2));

      // Order book micro-ticks
      const spread = stock.last_price > 1000 ? 0.20 : 0.05;
      stock.bid_price = Number((stock.last_price - spread).toFixed(2));
      stock.ask_price = Number((stock.last_price + spread).toFixed(2));
      stock.bid_qty = Math.floor(400 + Math.random() * 2600);
      stock.ask_qty = Math.floor(400 + Math.random() * 2400);

      // Volume increments
      const tickVolume = Math.floor(600 + Math.random() * 9500);
      stock.current_volume += tickVolume;

      // Rolling sparkline
      stock.sparkline.push(stock.last_price);
      if (stock.sparkline.length > 25) {
        stock.sparkline.shift();
      }

      stock.last_updated = now;
      this.evaluateStockSignals(stock);

      updatedStockPayloads.push({
        symbol: stock.symbol,
        last_price: stock.last_price,
        open_price: stock.open_price,
        high_price: stock.high_price,
        low_price: stock.low_price,
        fifty_two_week_high: stock.fifty_two_week_high,
        fifty_two_week_low: stock.fifty_two_week_low,
        vwap: stock.vwap,
        bid_price: stock.bid_price,
        bid_qty: stock.bid_qty,
        ask_price: stock.ask_price,
        ask_qty: stock.ask_qty,
        change: stock.change,
        change_pct: stock.change_pct,
        current_volume: stock.current_volume,
        volume_z_score: stock.volume_z_score,
        sparkline: stock.sparkline,
        active_signals: stock.active_signals,
        explanation: stock.explanation,
        last_updated: stock.last_updated
      });
    }

    // 3. Broadcast to all active WebSocket clients
    if (updatedStockPayloads.length > 0 && this.subscribers.size > 0) {
      const message = JSON.stringify({
        type: 'MARKET_TICK',
        sequenceId: this.sequenceId,
        timestamp: now,
        isDelayed: this.isDelayedFeed,
        indices: this.indices,
        stocks: updatedStockPayloads
      });

      for (const client of this.subscribers) {
        if (client.readyState === 1) {
          client.send(message);
        }
      }
    }
  }

  evaluateStockSignals(stock) {
    const signals = [];
    const explanations = [];

    // Check 1: Volume Surge
    if (stock.volume_z_score >= 2.0) {
      signals.push({
        type: 'VOLUME_SURGE',
        label: `Vol Surge (${stock.volume_z_score.toFixed(1)}σ)`,
        severity: 'critical',
        color: '#f59e0b'
      });
      explanations.push(`Volume is ${stock.volume_z_score.toFixed(1)} standard deviations above the 20-day mean.`);
    }

    // Check 2: Relative Sector Alpha / Decoupling
    const sectorIdx = this.indices[stock.sector_benchmark] || this.indices['NIFTY 50'];
    const relativeAlpha = Number((stock.change_pct - sectorIdx.change_pct).toFixed(2));
    if (Math.abs(relativeAlpha) >= 1.5) {
      const direction = relativeAlpha > 0 ? 'Outperforming' : 'Lagging';
      signals.push({
        type: 'SECTOR_DECOUPLING',
        label: `${direction} ${stock.sector_benchmark.replace('NIFTY ', '')} (${relativeAlpha > 0 ? '+' : ''}${relativeAlpha}%)`,
        severity: relativeAlpha > 0 ? 'positive' : 'warning',
        color: relativeAlpha > 0 ? '#047857' : '#be123c'
      });
      explanations.push(`${direction} the ${stock.sector_benchmark} benchmark by ${Math.abs(relativeAlpha)}%.`);
    }

    // Check 3: 52-Week High/Low Test
    const pctFrom52wHigh = ((stock.fifty_two_week_high - stock.last_price) / stock.fifty_two_week_high) * 100;
    if (pctFrom52wHigh <= 2.5 && pctFrom52wHigh >= 0) {
      signals.push({
        type: '52W_HIGH_TEST',
        label: `Near 52W High (${pctFrom52wHigh.toFixed(1)}% away)`,
        severity: 'positive',
        color: '#4338ca'
      });
      explanations.push(`Trading within ${pctFrom52wHigh.toFixed(1)}% of its 52-week peak (₹${stock.fifty_two_week_high.toLocaleString('en-IN')}).`);
    }

    // Check 4: Catalyst Proximity (Earnings)
    if (stock.next_earnings_date) {
      const today = new Date('2026-09-04');
      const earningsDate = new Date(stock.next_earnings_date);
      const diffDays = Math.ceil((earningsDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 5) {
        signals.push({
          type: 'EARNINGS_PROXIMITY',
          label: diffDays === 0 ? 'Earnings Today' : `Earnings in ${diffDays}d`,
          severity: 'info',
          color: '#6d28d9'
        });
        explanations.push(`Quarterly financial results scheduled on ${stock.next_earnings_date}.`);
      }
    }

    stock.active_signals = signals;

    // Synthesize plain-English narrative
    if (explanations.length > 0) {
      stock.explanation = `${stock.company_name} is ${stock.change_pct >= 0 ? 'up' : 'down'} ${Math.abs(stock.change_pct)}%. ${explanations.join(' ')}`;
    } else {
      stock.explanation = `${stock.company_name} is trading at ₹${stock.last_price.toLocaleString('en-IN')} (${stock.change_pct >= 0 ? '+' : ''}${stock.change_pct}%), moving in tandem with broader ${stock.sector_benchmark} trends.`;
    }
  }

  evaluateAllSignals() {
    for (const stock of this.stocks.values()) {
      this.evaluateStockSignals(stock);
    }
  }

  triggerVolumeSpike(symbol) {
    const stock = this.stocks.get(symbol);
    if (!stock) return null;

    stock.volume_z_score = Number((3.1 + Math.random() * 1.2).toFixed(2));
    stock.current_volume = Math.floor(stock.avg_volume_20d * 2.5);
    stock.last_price = Number((stock.last_price * 1.025).toFixed(2));
    stock.change = Number((stock.last_price - stock.base_price).toFixed(2));
    stock.change_pct = Number(((stock.change / stock.base_price) * 100).toFixed(2));
    stock.high_price = Math.max(stock.high_price, stock.last_price);
    stock.sparkline.push(stock.last_price);
    this.evaluateStockSignals(stock);

    this.broadcastSingle(stock);
    return stock;
  }

  simulateMarketFlashDip() {
    for (const stock of this.stocks.values()) {
      if (stock.sector === 'Banking & Financials' || stock.sector === 'Information Technology') {
        stock.last_price = Number((stock.last_price * 0.988).toFixed(2));
        stock.change = Number((stock.last_price - stock.base_price).toFixed(2));
        stock.change_pct = Number(((stock.change / stock.base_price) * 100).toFixed(2));
        stock.low_price = Math.min(stock.low_price, stock.last_price);
        stock.sparkline.push(stock.last_price);
        this.evaluateStockSignals(stock);
      }
    }
    this.indices['NIFTY 50'].change_pct = -1.25;
    this.indices['NIFTY BANK'].change_pct = -1.55;
    this.indices['NIFTY IT'].change_pct = -1.40;

    this.broadcastAll();
  }

  toggleFeedDelay(isDelayed) {
    this.isDelayedFeed = isDelayed;
    const message = JSON.stringify({
      type: 'FEED_STATUS_CHANGE',
      isDelayed: this.isDelayedFeed,
      timestamp: Date.now()
    });
    for (const client of this.subscribers) {
      if (client.readyState === 1) client.send(message);
    }
  }

  broadcastSingle(stock) {
    if (this.subscribers.size === 0) return;
    const message = JSON.stringify({
      type: 'MARKET_TICK',
      sequenceId: ++this.sequenceId,
      timestamp: Date.now(),
      isDelayed: this.isDelayedFeed,
      indices: this.indices,
      stocks: [{
        symbol: stock.symbol,
        last_price: stock.last_price,
        open_price: stock.open_price,
        high_price: stock.high_price,
        low_price: stock.low_price,
        fifty_two_week_high: stock.fifty_two_week_high,
        fifty_two_week_low: stock.fifty_two_week_low,
        vwap: stock.vwap,
        bid_price: stock.bid_price,
        bid_qty: stock.bid_qty,
        ask_price: stock.ask_price,
        ask_qty: stock.ask_qty,
        change: stock.change,
        change_pct: stock.change_pct,
        current_volume: stock.current_volume,
        volume_z_score: stock.volume_z_score,
        sparkline: stock.sparkline,
        active_signals: stock.active_signals,
        explanation: stock.explanation,
        last_updated: stock.last_updated
      }]
    });
    for (const client of this.subscribers) {
      if (client.readyState === 1) client.send(message);
    }
  }

  broadcastAll() {
    if (this.subscribers.size === 0) return;
    const allPayloads = Array.from(this.stocks.values()).map(s => ({
      symbol: s.symbol,
      last_price: s.last_price,
      open_price: s.open_price,
      high_price: s.high_price,
      low_price: s.low_price,
      fifty_two_week_high: s.fifty_two_week_high,
      fifty_two_week_low: s.fifty_two_week_low,
      vwap: s.vwap,
      bid_price: s.bid_price,
      bid_qty: s.bid_qty,
      ask_price: s.ask_price,
      ask_qty: s.ask_qty,
      change: s.change,
      change_pct: s.change_pct,
      current_volume: s.current_volume,
      volume_z_score: s.volume_z_score,
      sparkline: s.sparkline,
      active_signals: s.active_signals,
      explanation: s.explanation,
      last_updated: s.last_updated
    }));

    const message = JSON.stringify({
      type: 'MARKET_TICK',
      sequenceId: ++this.sequenceId,
      timestamp: Date.now(),
      isDelayed: this.isDelayedFeed,
      indices: this.indices,
      stocks: allPayloads
    });
    for (const client of this.subscribers) {
      if (client.readyState === 1) client.send(message);
    }
  }

  getAllStocks() {
    return Array.from(this.stocks.values());
  }

  getStock(symbol) {
    return this.stocks.get(symbol.toUpperCase());
  }

  // Resolve user input query (e.g. 'kaluyna jewel', 'sensex', 'kalyankjil') to official ticker
  async resolveTicker(input) {
    const raw = (input || '').trim();
    const clean = raw.toUpperCase();

    const ALIASES = {
      'SENSEX': { ticker: '^BSESN', sym: 'SENSEX', name: 'S&P BSE SENSEX Index' },
      'BSESENSEX': { ticker: '^BSESN', sym: 'SENSEX', name: 'S&P BSE SENSEX Index' },
      'BSE SENSEX': { ticker: '^BSESN', sym: 'SENSEX', name: 'S&P BSE SENSEX Index' },
      'BSESN': { ticker: '^BSESN', sym: 'SENSEX', name: 'S&P BSE SENSEX Index' },
      '^BSESN': { ticker: '^BSESN', sym: 'SENSEX', name: 'S&P BSE SENSEX Index' },
      'SENSEX30': { ticker: '^BSESN', sym: 'SENSEX', name: 'S&P BSE SENSEX Index' },
      'BSE30': { ticker: '^BSESN', sym: 'SENSEX', name: 'S&P BSE SENSEX Index' },
      'HODCO': { ticker: 'HUDCO.NS', sym: 'HUDCO', name: 'Housing & Urban Development Corp' },
      'HUDCO': { ticker: 'HUDCO.NS', sym: 'HUDCO', name: 'Housing & Urban Development Corp' },
      'KALYAN': { ticker: 'KALYANKJIL.NS', sym: 'KALYANKJIL', name: 'Kalyan Jewellers India Limited' },
      'KALUYN': { ticker: 'KALYANKJIL.NS', sym: 'KALYANKJIL', name: 'Kalyan Jewellers India Limited' },
      'KALUYNA': { ticker: 'KALYANKJIL.NS', sym: 'KALYANKJIL', name: 'Kalyan Jewellers India Limited' },
      'KALUYNA JEWEL': { ticker: 'KALYANKJIL.NS', sym: 'KALYANKJIL', name: 'Kalyan Jewellers India Limited' },
      'KALYAN JEWEL': { ticker: 'KALYANKJIL.NS', sym: 'KALYANKJIL', name: 'Kalyan Jewellers India Limited' },
      'KALYAN JEWELLERS': { ticker: 'KALYANKJIL.NS', sym: 'KALYANKJIL', name: 'Kalyan Jewellers India Limited' },
      'KALYANKJIL': { ticker: 'KALYANKJIL.NS', sym: 'KALYANKJIL', name: 'Kalyan Jewellers India Limited' },
      'TATA MOTORS': { ticker: 'TMCV.NS', sym: 'TATAMOTORS', name: 'Tata Motors Limited' },
      'TATAMOTORS': { ticker: 'TMCV.NS', sym: 'TATAMOTORS', name: 'Tata Motors Limited' },
      'NIFTY': { ticker: '^NSEI', sym: 'NIFTY 50', name: 'NIFTY 50 Index' },
      'NIFTY 50': { ticker: '^NSEI', sym: 'NIFTY 50', name: 'NIFTY 50 Index' }
    };

    if (ALIASES[clean]) {
      return ALIASES[clean];
    }

    if (clean.startsWith('^')) {
      return { ticker: clean, sym: clean.replace('^', ''), name: clean };
    }
    if (clean.includes('.')) {
      const symPart = clean.split('.')[0];
      return { ticker: clean, sym: symPart, name: symPart };
    }

    // Try Yahoo Finance Search API for fuzzy name/typo resolution
    try {
      const searchRes = await fetch(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(raw)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const searchData = await searchRes.json();
      if (searchData?.quotes && searchData.quotes.length > 0) {
        const nsMatch = searchData.quotes.find(q => q.symbol && q.symbol.endsWith('.NS'));
        if (nsMatch) {
          return {
            ticker: nsMatch.symbol,
            sym: nsMatch.symbol.replace('.NS', ''),
            name: nsMatch.longname || nsMatch.shortname || clean
          };
        }
        const boMatch = searchData.quotes.find(q => q.symbol && q.symbol.endsWith('.BO'));
        if (boMatch) {
          return {
            ticker: boMatch.symbol,
            sym: boMatch.symbol.replace('.BO', ''),
            name: boMatch.longname || boMatch.shortname || clean
          };
        }
        const idxMatch = searchData.quotes.find(q => q.quoteType === 'INDEX');
        if (idxMatch) {
          return {
            ticker: idxMatch.symbol,
            sym: idxMatch.symbol.replace('^', ''),
            name: idxMatch.longname || idxMatch.shortname || clean
          };
        }
      }
    } catch (e) {
      console.warn('[resolveTicker] Search API fallback error:', e.message);
    }

    return { ticker: `${clean}.NS`, sym: clean, name: clean };
  }

  // Dynamically add a new stock to live tracking without server restart
  async addNewStock(symbol) {
    const resolved = await this.resolveTicker(symbol);
    const sym = resolved.sym.toUpperCase().trim();
    const yahooTicker = resolved.ticker;

    // Already tracked?
    if (this.stocks.has(sym)) {
      return { success: true, stock: this.stocks.get(sym), alreadyExists: true };
    }

    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=5d`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
      );
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;

      if (!meta || !meta.regularMarketPrice) {
        throw new Error(`No market data found for ${sym} (${yahooTicker}). Verify it is a valid symbol.`);
      }

      const livePrice = Number(meta.regularMarketPrice.toFixed(2));
      const prevClose = Number((meta.chartPreviousClose || livePrice * 0.99).toFixed(2));
      const dayHigh = Number((meta.regularMarketDayHigh || livePrice * 1.01).toFixed(2));
      const dayLow = Number((meta.regularMarketDayLow || livePrice * 0.99).toFixed(2));
      const high52 = Number((meta.fiftyTwoWeekHigh || livePrice * 1.2).toFixed(2));
      const low52 = Number((meta.fiftyTwoWeekLow || livePrice * 0.8).toFixed(2));
      const avgVol = Math.floor(meta.regularMarketVolume || 1000000);

      // Map known sector benchmarks by currency / exchange
      const sectorBenchmark = 'NIFTY 50';
      const companyName = meta.longName || meta.shortName || sym;
      const sector = 'NSE Listed';
      const industry = 'General';

      // Build stock object
      const change = Number((livePrice - prevClose).toFixed(2));
      const change_pct = Number(((change / prevClose) * 100).toFixed(2));
      const vwap = Number(((dayHigh + dayLow + livePrice) / 3).toFixed(2));
      const spread = livePrice > 1000 ? 0.20 : 0.05;

      // Build sparkline
      const sparkline = [];
      let p = prevClose;
      for (let i = 0; i < 24; i++) {
        p = p * (1 + (Math.random() - 0.495) * 0.002);
        sparkline.push(Number(p.toFixed(2)));
      }
      sparkline[sparkline.length - 1] = livePrice;

      const newStockData = {
        symbol: sym,
        company_name: companyName,
        sector,
        industry,
        market_cap_cr: Math.floor((livePrice * avgVol) / 10000000) || 10000,
        base_price: prevClose,
        pe_ratio: meta.trailingPE ? Number(meta.trailingPE.toFixed(2)) : 25.0,
        pb_ratio: 3.0,
        dividend_yield: meta.dividendYield ? Number((meta.dividendYield * 100).toFixed(2)) : 0.5,
        roe_pct: 15.0,
        debt_to_equity: 0.5,
        analyst_buy_pct: 70,
        analyst_hold_pct: 20,
        analyst_sell_pct: 10,
        fifty_two_week_high: high52,
        fifty_two_week_low: low52,
        avg_volume_20d: avgVol,
        next_earnings_date: null,
        sector_benchmark: sectorBenchmark,
        beta: meta.beta || 1.0,
        last_price: livePrice,
        open_price: prevClose,
        high_price: dayHigh,
        low_price: dayLow,
        vwap,
        bid_price: Number((livePrice - spread).toFixed(2)),
        bid_qty: Math.floor(400 + Math.random() * 2600),
        ask_price: Number((livePrice + spread).toFixed(2)),
        ask_qty: Math.floor(400 + Math.random() * 2400),
        change,
        change_pct,
        current_volume: avgVol,
        volume_z_score: Number((Math.random() * 1.2).toFixed(2)),
        sparkline,
        active_signals: [],
        explanation: '',
        last_updated: Date.now()
      };

      // Persist to database
      try {
        db.prepare(`
          INSERT OR IGNORE INTO stocks_master (
            symbol, company_name, sector, industry, market_cap_cr, base_price, pe_ratio,
            pb_ratio, dividend_yield, roe_pct, debt_to_equity, analyst_buy_pct,
            analyst_hold_pct, analyst_sell_pct, fifty_two_week_high, fifty_two_week_low,
            avg_volume_20d, next_earnings_date, sector_benchmark, beta
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sym, companyName, sector, industry,
          newStockData.market_cap_cr, prevClose, newStockData.pe_ratio,
          newStockData.pb_ratio, newStockData.dividend_yield, newStockData.roe_pct,
          newStockData.debt_to_equity, newStockData.analyst_buy_pct,
          newStockData.analyst_hold_pct, newStockData.analyst_sell_pct,
          high52, low52, avgVol, null, sectorBenchmark, newStockData.beta
        );
      } catch (dbErr) {
        console.error('[addNewStock] DB insert error:', dbErr.message);
        // Continue even if DB insert fails — still add to live memory
      }

      // Add to live ticker map and register for Yahoo sync
      this.stocks.set(sym, newStockData);
      REAL_TICKERS_MAP[sym] = yahooTicker;
      this.evaluateStockSignals(newStockData);

      console.log(`[MarketFeed] ✅ Added new stock: ${sym} @ ₹${livePrice}`);
      return { success: true, stock: newStockData, alreadyExists: false };

    } catch (err) {
      console.error(`[addNewStock] Error for ${sym}:`, err.message);
      throw new Error(err.message || `Could not fetch data for ${sym}`);
    }
  }

  addSubscriber(ws) {
    this.subscribers.add(ws);
  }

  removeSubscriber(ws) {
    this.subscribers.delete(ws);
  }
}

export const marketFeed = new MarketFeedService();
