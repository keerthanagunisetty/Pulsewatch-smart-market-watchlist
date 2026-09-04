import express from 'express';
import db from '../db/index.js';
import { authenticateToken } from './auth.js';
import { marketFeed } from '../services/marketFeed.js';

const router = express.Router();

// Apply auth to all watchlist routes
router.use(authenticateToken);

// Get all watchlists with enriched live stock items for user
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const watchlists = db.prepare(`
      SELECT id, name, description, is_default, created_at
      FROM watchlists
      WHERE user_id = ?
      ORDER BY is_default DESC, id ASC
    `).all(userId);

    const getItemsStmt = db.prepare(`
      SELECT wi.id, wi.symbol, wi.sort_order, wi.notes, wi.custom_tags,
             wi.alert_price_high, wi.alert_price_low, wi.added_at
      FROM watchlist_items wi
      WHERE wi.watchlist_id = ?
      ORDER BY wi.sort_order ASC, wi.id ASC
    `);

    const result = watchlists.map(wl => {
      const rawItems = getItemsStmt.all(wl.id);
      const items = rawItems.map(item => {
        const liveStock = marketFeed.getStock(item.symbol) || {
          symbol: item.symbol,
          company_name: item.symbol,
          sector: 'Unknown',
          last_price: 0,
          change: 0,
          change_pct: 0,
          current_volume: 0,
          volume_z_score: 0,
          sparkline: [],
          active_signals: [],
          explanation: ''
        };

        return {
          id: item.id,
          symbol: item.symbol,
          sort_order: item.sort_order,
          notes: item.notes,
          custom_tags: item.custom_tags ? item.custom_tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          alert_price_high: item.alert_price_high,
          alert_price_low: item.alert_price_low,
          added_at: item.added_at,
          live: liveStock
        };
      });

      return {
        ...wl,
        is_default: Boolean(wl.is_default),
        items
      };
    });

    res.json({ watchlists: result });
  } catch (err) {
    console.error('Error fetching watchlists:', err);
    res.status(500).json({ error: 'Failed to fetch watchlists' });
  }
});

// Create new watchlist
router.post('/', (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Watchlist name is required' });
    }

    const insertWl = db.prepare(`
      INSERT INTO watchlists (user_id, name, description, is_default)
      VALUES (?, ?, ?, 0)
    `);
    const info = insertWl.run(userId, name.trim(), (description || '').trim());
    const newId = Number(info.lastInsertRowid);

    res.status(201).json({
      success: true,
      watchlist: {
        id: newId,
        name: name.trim(),
        description: (description || '').trim(),
        is_default: false,
        items: []
      }
    });
  } catch (err) {
    console.error('Error creating watchlist:', err);
    res.status(500).json({ error: 'Failed to create watchlist' });
  }
});

// Update/rename watchlist
router.put('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const watchlistId = Number(req.params.id);
    const { name, description } = req.body;

    const wl = db.prepare('SELECT id FROM watchlists WHERE id = ? AND user_id = ?').get(watchlistId, userId);
    if (!wl) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    db.prepare('UPDATE watchlists SET name = ?, description = ? WHERE id = ?').run(
      name ? name.trim() : 'My Watchlist',
      description !== undefined ? description.trim() : '',
      watchlistId
    );

    res.json({ success: true, message: 'Watchlist updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

// Delete watchlist
router.delete('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const watchlistId = Number(req.params.id);

    const wl = db.prepare('SELECT id, is_default FROM watchlists WHERE id = ? AND user_id = ?').get(watchlistId, userId);
    if (!wl) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    if (wl.is_default) {
      return res.status(400).json({ error: 'Default watchlist cannot be deleted' });
    }

    db.prepare('DELETE FROM watchlists WHERE id = ?').run(watchlistId);
    res.json({ success: true, message: 'Watchlist deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete watchlist' });
  }
});

// Add stock to watchlist — auto-fetches from NSE if not yet tracked
router.post('/:id/items', async (req, res) => {
  try {
    const userId = req.user.id;
    const watchlistId = Number(req.params.id);
    const { symbol, notes, custom_tags } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }

    const cleanSymbol = symbol.toUpperCase().trim();

    // Verify watchlist ownership first
    const wl = db.prepare('SELECT id FROM watchlists WHERE id = ? AND user_id = ?').get(watchlistId, userId);
    if (!wl) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    // Check if already in watchlist
    const existing = db.prepare('SELECT id FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?').get(watchlistId, cleanSymbol);
    if (existing) {
      return res.status(409).json({ error: `${cleanSymbol} is already in this watchlist` });
    }

    // Get live stock data — auto-fetch from Yahoo Finance if not yet tracked
    let stock = marketFeed.getStock(cleanSymbol);
    if (!stock) {
      try {
        const addResult = await marketFeed.addNewStock(cleanSymbol);
        stock = addResult.stock;
      } catch (fetchErr) {
        return res.status(404).json({ error: `Could not find or fetch data for ${cleanSymbol}. Check the NSE symbol and try again.` });
      }
    }

    // Get current max sort order
    const maxOrderRow = db.prepare('SELECT MAX(sort_order) as maxOrder FROM watchlist_items WHERE watchlist_id = ?').get(watchlistId);
    const nextOrder = (maxOrderRow?.maxOrder ?? -1) + 1;

    const tagsStr = Array.isArray(custom_tags) ? custom_tags.join(',') : (custom_tags || '');

    const insert = db.prepare(`
      INSERT INTO watchlist_items (watchlist_id, symbol, sort_order, notes, custom_tags)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = insert.run(watchlistId, cleanSymbol, nextOrder, notes || '', tagsStr);

    res.status(201).json({
      success: true,
      item: {
        id: Number(info.lastInsertRowid),
        symbol: cleanSymbol,
        sort_order: nextOrder,
        notes: notes || '',
        custom_tags: tagsStr ? tagsStr.split(',') : [],
        live: stock
      }
    });
  } catch (err) {
    console.error('Error adding stock item:', err);
    res.status(500).json({ error: 'Failed to add stock to watchlist' });
  }
});

// Remove stock from watchlist
router.delete('/:id/items/:symbol', (req, res) => {
  try {
    const userId = req.user.id;
    const watchlistId = Number(req.params.id);
    const symbol = req.params.symbol.toUpperCase().trim();

    const wl = db.prepare('SELECT id FROM watchlists WHERE id = ? AND user_id = ?').get(watchlistId, userId);
    if (!wl) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    db.prepare('DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?').run(watchlistId, symbol);
    res.json({ success: true, message: `${symbol} removed from watchlist` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove stock' });
  }
});

// Update notes & tags for a stock in a watchlist
router.put('/:id/items/:symbol/notes', (req, res) => {
  try {
    const userId = req.user.id;
    const watchlistId = Number(req.params.id);
    const symbol = req.params.symbol.toUpperCase().trim();
    const { notes, custom_tags } = req.body;

    const wl = db.prepare('SELECT id FROM watchlists WHERE id = ? AND user_id = ?').get(watchlistId, userId);
    if (!wl) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    const tagsStr = Array.isArray(custom_tags) ? custom_tags.join(',') : (custom_tags !== undefined ? custom_tags : null);

    if (tagsStr !== null) {
      db.prepare('UPDATE watchlist_items SET notes = ?, custom_tags = ? WHERE watchlist_id = ? AND symbol = ?').run(
        notes || '',
        tagsStr,
        watchlistId,
        symbol
      );
    } else {
      db.prepare('UPDATE watchlist_items SET notes = ? WHERE watchlist_id = ? AND symbol = ?').run(
        notes || '',
        watchlistId,
        symbol
      );
    }

    res.json({ success: true, message: 'Notes and tags saved successfully' });
  } catch (err) {
    console.error('Error updating notes:', err);
    res.status(500).json({ error: 'Failed to update stock notes' });
  }
});

export default router;
