import express from 'express';
import { marketFeed } from '../services/marketFeed.js';

const router = express.Router();

// Get all master stocks with live telemetry
router.get('/', (req, res) => {
  try {
    const { sector, signal } = req.query;
    let stocks = marketFeed.getAllStocks();

    if (sector && sector !== 'ALL') {
      stocks = stocks.filter(s => s.sector.toLowerCase().includes(sector.toLowerCase()) || s.sector_benchmark.toLowerCase().includes(sector.toLowerCase()));
    }

    if (signal) {
      if (signal === 'ANOMALIES') {
        stocks = stocks.filter(s => s.active_signals.length > 0);
      } else if (signal === 'VOLUME_SURGE') {
        stocks = stocks.filter(s => s.active_signals.some(sig => sig.type === 'VOLUME_SURGE'));
      } else if (signal === 'EARNINGS') {
        stocks = stocks.filter(s => s.active_signals.some(sig => sig.type === 'EARNINGS_PROXIMITY'));
      } else if (signal === 'GAINERS') {
        stocks = stocks.filter(s => s.change_pct > 0).sort((a, b) => b.change_pct - a.change_pct);
      } else if (signal === 'LOSERS') {
        stocks = stocks.filter(s => s.change_pct < 0).sort((a, b) => a.change_pct - b.change_pct);
      }
    }

    res.json({
      count: stocks.length,
      indices: marketFeed.indices,
      stocks
    });
  } catch (err) {
    console.error('Error fetching stocks:', err);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// Get market benchmark indices
router.get('/indices', (req, res) => {
  res.json({ indices: marketFeed.indices });
});

// Get active market signals / anomalies
router.get('/signals', (req, res) => {
  try {
    const allStocks = marketFeed.getAllStocks();
    const signals = [];

    for (const stock of allStocks) {
      for (const sig of stock.active_signals) {
        signals.push({
          symbol: stock.symbol,
          company_name: stock.company_name,
          price: stock.last_price,
          change_pct: stock.change_pct,
          ...sig,
          explanation: stock.explanation
        });
      }
    }

    res.json({ count: signals.length, signals });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

// Get single stock detailed profile
router.get('/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase().trim();
    const stock = marketFeed.getStock(symbol);

    if (!stock) {
      return res.status(404).json({ error: `Stock ${symbol} not found` });
    }

    const sectorBenchmark = marketFeed.indices[stock.sector_benchmark] || marketFeed.indices['NIFTY 50'];

    res.json({
      stock,
      benchmark: sectorBenchmark,
      relative_alpha: Number((stock.change_pct - (sectorBenchmark ? sectorBenchmark.change_pct : 0)).toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stock detail' });
  }
});

// Chaos simulator endpoint for judges
router.post('/simulation/chaos', (req, res) => {
  try {
    const { action, symbol, isDelayed } = req.body;

    if (action === 'volume_spike') {
      const targetSymbol = (symbol || 'INFY').toUpperCase();
      const updated = marketFeed.triggerVolumeSpike(targetSymbol);
      if (!updated) {
        return res.status(404).json({ error: `Symbol ${targetSymbol} not found` });
      }
      return res.json({
        success: true,
        message: `Injected volume surge and price spike into ${targetSymbol}`,
        stock: updated
      });
    }

    if (action === 'market_dip') {
      marketFeed.simulateMarketFlashDip();
      return res.json({
        success: true,
        message: 'Simulated sector-wide flash pullback across Banking & IT'
      });
    }

    if (action === 'toggle_delay') {
      marketFeed.toggleFeedDelay(Boolean(isDelayed));
      return res.json({
        success: true,
        isDelayedFeed: marketFeed.isDelayedFeed,
        message: marketFeed.isDelayedFeed ? 'Feed set to DELAYED / STALE simulation' : 'Feed restored to LIVE'
      });
    }

    res.status(400).json({ error: 'Unknown chaos action' });
  } catch (err) {
    console.error('Chaos simulation error:', err);
    res.status(500).json({ error: 'Simulation trigger failed' });
  }
});

// Add a brand-new stock to live tracking by NSE symbol
router.post('/add', async (req, res) => {
  try {
    const { symbol } = req.body;
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'symbol is required in request body' });
    }

    const result = await marketFeed.addNewStock(symbol.toUpperCase().trim());

    if (result.alreadyExists) {
      return res.json({
        success: true,
        message: `${symbol.toUpperCase()} is already tracked in the live feed.`,
        stock: result.stock
      });
    }

    return res.status(201).json({
      success: true,
      message: `${symbol.toUpperCase()} added to live market feed. Data sourced from NSE via Yahoo Finance.`,
      stock: result.stock
    });

  } catch (err) {
    console.error('[POST /stocks/add]', err.message);
    res.status(422).json({ error: err.message || 'Failed to add stock' });
  }
});

export default router;
