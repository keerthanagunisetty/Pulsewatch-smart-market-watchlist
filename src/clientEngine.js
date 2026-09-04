// ============================================================================
// PulseWatch In-Browser Engine & Fallback Simulation
// Provides zero-downtime, standalone execution when deployed on static hosts
// (e.g. Vercel, Netlify, GitHub Pages) or when the backend server is unreachable.
// ============================================================================

export const INITIAL_BENCHMARKS = {
  'NIFTY 50': { name: 'NIFTY 50', price: 23985.60, change: 112.15, change_pct: 0.47 },
  'BSE SENSEX': { name: 'BSE SENSEX', price: 76681.08, change: 312.40, change_pct: 0.41 },
  'NIFTY BANK': { name: 'NIFTY BANK', price: 57612.05, change: 231.45, change_pct: 0.40 },
  'NIFTY IT': { name: 'NIFTY IT', price: 26450.00, change: 70.00, change_pct: 0.27 },
  'NIFTY AUTO': { name: 'NIFTY AUTO', price: 19250.00, change: 70.00, change_pct: 0.37 },
  'NIFTY ENERGY': { name: 'NIFTY ENERGY', price: 31450.00, change: 70.00, change_pct: 0.22 }
};

export const INITIAL_STOCKS = [
  {
    symbol: 'RELIANCE',
    company_name: 'Reliance Industries Ltd.',
    sector: 'Oil, Gas & Consumable Fuels',
    industry: 'Refining & Petrochemicals',
    market_cap_cr: 1980500,
    base_price: 1302.50,
    last_price: 1328.30,
    open_price: 1302.50,
    high_price: 1332.30,
    low_price: 1304.10,
    vwap: 1318.20,
    bid_price: 1328.10,
    bid_qty: 1200,
    ask_price: 1328.30,
    ask_qty: 1450,
    change: 25.80,
    change_pct: 1.98,
    current_volume: 5850000,
    volume_z_score: 1.45,
    fifty_two_week_high: 1608.80,
    fifty_two_week_low: 1215.00,
    pe_ratio: 27.8,
    pb_ratio: 2.4,
    dividend_yield: 0.35,
    roe_pct: 9.8,
    debt_to_equity: 0.38,
    analyst_buy_pct: 85,
    analyst_hold_pct: 10,
    analyst_sell_pct: 5,
    avg_volume_20d: 5850000,
    sector_benchmark: 'NIFTY ENERGY',
    active_signals: [],
    explanation: 'Reliance Industries is trading up 1.98% supported by steady gross refining margins.',
    sparkline: [1305, 1308, 1312, 1315, 1320, 1318, 1322, 1325, 1328.30]
  },
  {
    symbol: 'TCS',
    company_name: 'Tata Consultancy Services',
    sector: 'Information Technology',
    industry: 'IT Services & Consulting',
    market_cap_cr: 1520200,
    base_price: 2320.10,
    last_price: 2321.00,
    open_price: 2320.10,
    high_price: 2363.90,
    low_price: 2316.60,
    vwap: 2335.50,
    bid_price: 2320.80,
    bid_qty: 850,
    ask_price: 2321.00,
    ask_qty: 920,
    change: 0.90,
    change_pct: 0.04,
    current_volume: 2450000,
    volume_z_score: 0.82,
    fifty_two_week_high: 4585.00,
    fifty_two_week_low: 2150.00,
    pe_ratio: 31.2,
    pb_ratio: 14.8,
    dividend_yield: 2.15,
    roe_pct: 48.2,
    debt_to_equity: 0.0,
    analyst_buy_pct: 78,
    analyst_hold_pct: 15,
    analyst_sell_pct: 7,
    avg_volume_20d: 2450000,
    sector_benchmark: 'NIFTY IT',
    active_signals: [],
    explanation: 'TCS is holding steady around ₹2,321 following robust deal conversion in European markets.',
    sparkline: [2322, 2320, 2318, 2325, 2324, 2321]
  },
  {
    symbol: 'INFY',
    company_name: 'Infosys Limited',
    sector: 'Information Technology',
    industry: 'Digital Services & Consulting',
    market_cap_cr: 812400,
    base_price: 1130.30,
    last_price: 1132.10,
    open_price: 1130.30,
    high_price: 1146.70,
    low_price: 1128.30,
    vwap: 1136.40,
    bid_price: 1132.00,
    bid_qty: 1540,
    ask_price: 1132.20,
    ask_qty: 1800,
    change: 1.80,
    change_pct: 0.16,
    current_volume: 6850000,
    volume_z_score: 2.65,
    fifty_two_week_high: 1990.00,
    fifty_two_week_low: 1080.00,
    pe_ratio: 28.6,
    pb_ratio: 9.2,
    dividend_yield: 2.40,
    roe_pct: 32.5,
    debt_to_equity: 0.0,
    analyst_buy_pct: 88,
    analyst_hold_pct: 8,
    analyst_sell_pct: 4,
    avg_volume_20d: 6850000,
    sector_benchmark: 'NIFTY IT',
    active_signals: [
      { type: 'VOLUME_SURGE', label: 'Volume Surge (+2.7σ)', description: 'Volume is 2.65 standard deviations above 20d mean' },
      { type: 'EARNINGS_PROXIMITY', label: 'Catalyst Window', description: 'Quarterly financial disclosure due within 4 days' }
    ],
    explanation: 'Infosys is experiencing abnormal volume surge (+2.7σ) ahead of upcoming catalyst window.',
    sparkline: [1129, 1131, 1130, 1135, 1134, 1132.10]
  },
  {
    symbol: 'HDFCBANK',
    company_name: 'HDFC Bank Ltd.',
    sector: 'Banking & Financials',
    industry: 'Private Commercial Banking',
    market_cap_cr: 1265000,
    base_price: 706.65,
    last_price: 715.25,
    open_price: 706.65,
    high_price: 716.20,
    low_price: 708.35,
    vwap: 712.10,
    bid_price: 715.15,
    bid_qty: 2400,
    ask_price: 715.30,
    ask_qty: 2100,
    change: 8.60,
    change_pct: 1.22,
    current_volume: 15200000,
    volume_z_score: 1.30,
    fifty_two_week_high: 1794.00,
    fifty_two_week_low: 680.00,
    pe_ratio: 18.2,
    pb_ratio: 2.7,
    dividend_yield: 1.18,
    roe_pct: 16.4,
    debt_to_equity: 0.85,
    analyst_buy_pct: 92,
    analyst_hold_pct: 6,
    analyst_sell_pct: 2,
    avg_volume_20d: 15200000,
    sector_benchmark: 'NIFTY BANK',
    active_signals: [],
    explanation: 'HDFC Bank is trading up 1.22% with robust deposit growth metrics reported.',
    sparkline: [708, 710, 712, 711, 714, 715.25]
  },
  {
    symbol: 'KALYANKJIL',
    company_name: 'Kalyan Jewellers India Limited',
    sector: 'Consumer / FMCG',
    industry: 'Gems, Jewellery & Luxury Goods',
    market_cap_cr: 61500,
    base_price: 590.10,
    last_price: 598.85,
    open_price: 590.10,
    high_price: 604.50,
    low_price: 588.00,
    vwap: 596.20,
    bid_price: 598.75,
    bid_qty: 1800,
    ask_price: 598.95,
    ask_qty: 2200,
    change: 8.75,
    change_pct: 1.48,
    current_volume: 8500000,
    volume_z_score: 1.10,
    fifty_two_week_high: 794.00,
    fifty_two_week_low: 280.00,
    pe_ratio: 54.2,
    pb_ratio: 7.8,
    dividend_yield: 0.35,
    roe_pct: 18.5,
    debt_to_equity: 0.45,
    analyst_buy_pct: 85,
    analyst_hold_pct: 10,
    analyst_sell_pct: 5,
    avg_volume_20d: 8500000,
    sector_benchmark: 'NIFTY 50',
    active_signals: [],
    explanation: 'Kalyan Jewellers is up 1.48% amid festive retail jewelry demand expansion.',
    sparkline: [591, 593, 595, 594, 597, 598.85]
  },
  {
    symbol: 'SENSEX',
    company_name: 'S&P BSE SENSEX Index',
    sector: 'Benchmark Index',
    industry: 'BSE Index',
    market_cap_cr: 41000000,
    base_price: 76368.68,
    last_price: 76681.08,
    open_price: 76368.68,
    high_price: 76950.00,
    low_price: 76200.00,
    vwap: 76610.00,
    bid_price: 76680.50,
    bid_qty: 1000,
    ask_price: 76681.50,
    ask_qty: 1200,
    change: 312.40,
    change_pct: 0.41,
    current_volume: 50000000,
    volume_z_score: 0.95,
    fifty_two_week_high: 85978.00,
    fifty_two_week_low: 70800.00,
    pe_ratio: 24.1,
    pb_ratio: 3.5,
    dividend_yield: 1.20,
    roe_pct: 16.0,
    debt_to_equity: 0.30,
    analyst_buy_pct: 90,
    analyst_hold_pct: 8,
    analyst_sell_pct: 2,
    avg_volume_20d: 50000000,
    sector_benchmark: 'NIFTY 50',
    active_signals: [],
    explanation: 'S&P BSE SENSEX gained 312.40 points driven by broad-based banking and auto accumulation.',
    sparkline: [76400, 76480, 76550, 76620, 76681]
  },
  {
    symbol: 'TATAMOTORS',
    company_name: 'Tata Motors Limited',
    sector: 'Automobile',
    industry: 'Commercial & Passenger Vehicles',
    market_cap_cr: 172000,
    base_price: 462.50,
    last_price: 466.00,
    open_price: 462.50,
    high_price: 472.00,
    low_price: 460.50,
    vwap: 465.80,
    bid_price: 465.90,
    bid_qty: 3200,
    ask_price: 466.10,
    ask_qty: 3500,
    change: 3.50,
    change_pct: 0.76,
    current_volume: 12400000,
    volume_z_score: 0.90,
    fifty_two_week_high: 1179.00,
    fifty_two_week_low: 440.00,
    pe_ratio: 10.4,
    pb_ratio: 2.8,
    dividend_yield: 1.80,
    roe_pct: 24.1,
    debt_to_equity: 1.20,
    analyst_buy_pct: 82,
    analyst_hold_pct: 12,
    analyst_sell_pct: 6,
    avg_volume_20d: 12400000,
    sector_benchmark: 'NIFTY AUTO',
    active_signals: [],
    explanation: 'Tata Motors is trading steady with positive JLR free cash flow projections.',
    sparkline: [462, 464, 463, 465, 466]
  },
  {
    symbol: 'ICICIBANK',
    company_name: 'ICICI Bank Ltd.',
    sector: 'Banking & Financials',
    industry: 'Private Commercial Banking',
    market_cap_cr: 882000,
    base_price: 1430.00,
    last_price: 1432.70,
    open_price: 1430.00,
    high_price: 1438.30,
    low_price: 1423.40,
    vwap: 1431.10,
    bid_price: 1432.50,
    bid_qty: 1600,
    ask_price: 1432.80,
    ask_qty: 1900,
    change: 2.70,
    change_pct: 0.19,
    current_volume: 9800000,
    volume_z_score: 0.65,
    fifty_two_week_high: 1450.00,
    fifty_two_week_low: 980.00,
    pe_ratio: 17.5,
    pb_ratio: 3.1,
    dividend_yield: 0.75,
    roe_pct: 18.2,
    debt_to_equity: 0.70,
    analyst_buy_pct: 95,
    analyst_hold_pct: 4,
    analyst_sell_pct: 1,
    avg_volume_20d: 9800000,
    sector_benchmark: 'NIFTY BANK',
    active_signals: [],
    explanation: 'ICICI Bank maintains stable margin profile with benign credit costs.',
    sparkline: [1428, 1431, 1430, 1433, 1432.70]
  },
  {
    symbol: 'SBIN',
    company_name: 'State Bank of India',
    sector: 'Banking & Financials',
    industry: 'Public Sector Banking',
    market_cap_cr: 745000,
    base_price: 1023.40,
    last_price: 1024.70,
    open_price: 1023.40,
    high_price: 1032.00,
    low_price: 1018.50,
    vwap: 1025.20,
    bid_price: 1024.50,
    bid_qty: 2100,
    ask_price: 1024.80,
    ask_qty: 2500,
    change: 1.30,
    change_pct: 0.13,
    current_volume: 14500000,
    volume_z_score: 0.85,
    fifty_two_week_high: 1045.00,
    fifty_two_week_low: 555.00,
    pe_ratio: 11.2,
    pb_ratio: 1.8,
    dividend_yield: 1.65,
    roe_pct: 17.8,
    debt_to_equity: 0.90,
    analyst_buy_pct: 88,
    analyst_hold_pct: 9,
    analyst_sell_pct: 3,
    avg_volume_20d: 14500000,
    sector_benchmark: 'NIFTY BANK',
    active_signals: [],
    explanation: 'SBI is steady supported by robust retail loan growth across tier-2 cities.',
    sparkline: [1021, 1023, 1026, 1024, 1024.70]
  },
  {
    symbol: 'ITC',
    company_name: 'ITC Limited',
    sector: 'Consumer / FMCG',
    industry: 'Diversified Conglomerate',
    market_cap_cr: 540000,
    base_price: 263.00,
    last_price: 265.50,
    open_price: 263.00,
    high_price: 266.25,
    low_price: 262.65,
    vwap: 264.80,
    bid_price: 265.40,
    bid_qty: 5400,
    ask_price: 265.60,
    ask_qty: 4800,
    change: 2.50,
    change_pct: 0.95,
    current_volume: 18500000,
    volume_z_score: 1.15,
    fifty_two_week_high: 528.00,
    fifty_two_week_low: 245.00,
    pe_ratio: 26.5,
    pb_ratio: 7.4,
    dividend_yield: 3.45,
    roe_pct: 28.5,
    debt_to_equity: 0.0,
    analyst_buy_pct: 80,
    analyst_hold_pct: 15,
    analyst_sell_pct: 5,
    avg_volume_20d: 18500000,
    sector_benchmark: 'NIFTY 50',
    active_signals: [],
    explanation: 'ITC is up 0.95% backed by volume uptick in non-cigarette FMCG brands.',
    sparkline: [263, 264, 264.5, 265, 265.50]
  },
  {
    symbol: 'ZOMATO',
    company_name: 'Zomato Limited (Blinkit)',
    sector: 'Consumer / FMCG',
    industry: 'Quick Commerce & Food Delivery',
    market_cap_cr: 285000,
    base_price: 327.30,
    last_price: 324.80,
    open_price: 327.30,
    high_price: 331.00,
    low_price: 324.15,
    vwap: 326.50,
    bid_price: 324.70,
    bid_qty: 4100,
    ask_price: 324.90,
    ask_qty: 4600,
    change: -2.50,
    change_pct: -0.76,
    current_volume: 38000000,
    volume_z_score: 1.80,
    fifty_two_week_high: 340.00,
    fifty_two_week_low: 95.00,
    pe_ratio: 95.0,
    pb_ratio: 12.0,
    dividend_yield: 0.0,
    roe_pct: 12.5,
    debt_to_equity: 0.0,
    analyst_buy_pct: 90,
    analyst_hold_pct: 6,
    analyst_sell_pct: 4,
    avg_volume_20d: 38000000,
    sector_benchmark: 'NIFTY 50',
    active_signals: [],
    explanation: 'Zomato is trading lower by 0.76% following sector-wide quick commerce consolidation.',
    sparkline: [327, 326, 328, 325, 324.80]
  }
];

export const DEMO_USER = {
  id: 1,
  name: 'Priya Sharma (Judge Demo)',
  email: 'demo@groww.in',
  avatar_initials: 'PS',
  experience_level: 'Lead Quant / Pro',
  preferred_sectors: 'Technology, Banking & Financials, Consumer / FMCG'
};

export const INITIAL_WATCHLISTS = [
  {
    id: 1,
    name: 'High Momentum & Alpha',
    description: 'Active movers exhibiting volume surges and sector alpha decoupling',
    is_default: 1,
    items: [
      { id: 101, symbol: 'INFY', sort_order: 1, notes: 'Abnormal volume surge (+2.7σ). Watch earnings window.', custom_tags: ['momentum', 'earnings-catalyst'] },
      { id: 102, symbol: 'KALYANKJIL', sort_order: 2, notes: 'Retail expansion and strong festive demand compounder.', custom_tags: ['breakout', 'consumer'] },
      { id: 103, symbol: 'SENSEX', sort_order: 3, notes: 'Benchmark index exposure for relative delta tracking.', custom_tags: ['index', 'benchmark'] },
      { id: 104, symbol: 'RELIANCE', sort_order: 4, notes: 'Heavyweight anchor holding key 20-DMA support.', custom_tags: ['bluechip'] }
    ]
  },
  {
    id: 2,
    name: 'Core Nifty Bluechips',
    description: 'Stable large-cap compounders with high ROE and strong balance sheets',
    is_default: 0,
    items: [
      { id: 201, symbol: 'HDFCBANK', sort_order: 1, notes: 'Private banking anchor position.', custom_tags: ['banking', 'dividend'] },
      { id: 202, symbol: 'ICICIBANK', sort_order: 2, notes: 'Strong NIM margin resilience.', custom_tags: ['core'] },
      { id: 203, symbol: 'SBIN', sort_order: 3, notes: 'Public sector banking leader.', custom_tags: ['psu'] },
      { id: 204, symbol: 'ITC', sort_order: 4, notes: 'FMCG cash-flow cow with 3.4% dividend yield.', custom_tags: ['dividend'] }
    ]
  },
  {
    id: 3,
    name: 'Tech & Growth Radar',
    description: 'High beta technology & digital consumer leaders',
    is_default: 0,
    items: [
      { id: 301, symbol: 'INFY', sort_order: 1, notes: 'AI transformation multi-year tailwinds.', custom_tags: ['tech'] },
      { id: 302, symbol: 'TCS', sort_order: 2, notes: 'Resilient order book and dividend consistency.', custom_tags: ['largecap'] },
      { id: 303, symbol: 'ZOMATO', sort_order: 3, notes: 'Quick-commerce Blinkit dark store hypergrowth.', custom_tags: ['hypergrowth'] },
      { id: 304, symbol: 'TATAMOTORS', sort_order: 4, notes: 'EV market share leader in passenger vehicles.', custom_tags: ['ev'] }
    ]
  }
];

class ClientSimulationEngine {
  constructor() {
    this.stocks = new Map();
    this.indices = { ...INITIAL_BENCHMARKS };
    this.timer = null;
    this.onTickCallback = null;
    this.init();
  }

  init() {
    for (const s of INITIAL_STOCKS) {
      this.stocks.set(s.symbol, { ...s, sparkline: [...s.sparkline] });
    }
  }

  getStoredWatchlists() {
    try {
      const stored = localStorage.getItem('pulsewatch_watchlists');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem('pulsewatch_watchlists', JSON.stringify(INITIAL_WATCHLISTS));
    return JSON.parse(JSON.stringify(INITIAL_WATCHLISTS));
  }

  saveStoredWatchlists(wls) {
    try {
      localStorage.setItem('pulsewatch_watchlists', JSON.stringify(wls));
    } catch (e) {}
  }

  // Auth Operations
  handleDemoLogin() {
    localStorage.setItem('pulsewatch_user', JSON.stringify(DEMO_USER));
    localStorage.setItem('pulsewatch_token', 'demo-token-client-sim');
    return {
      success: true,
      token: 'demo-token-client-sim',
      user: DEMO_USER
    };
  }

  handleLogin(email, password) {
    // If demo credentials or any email
    const users = JSON.parse(localStorage.getItem('pulsewatch_registered_users') || '[]');
    const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (matched) {
      localStorage.setItem('pulsewatch_user', JSON.stringify(matched));
      localStorage.setItem('pulsewatch_token', 'user-token-' + matched.id);
      return { success: true, token: 'user-token-' + matched.id, user: matched };
    }

    if (email === 'demo@groww.in' || email.includes('groww')) {
      return this.handleDemoLogin();
    }

    // Default fallback user for testing
    const fallback = {
      id: Date.now(),
      name: email.split('@')[0],
      email,
      avatar_initials: email.slice(0, 2).toUpperCase(),
      experience_level: 'Active Trader',
      preferred_sectors: 'Technology, Banking'
    };
    localStorage.setItem('pulsewatch_user', JSON.stringify(fallback));
    localStorage.setItem('pulsewatch_token', 'token-' + fallback.id);
    return { success: true, token: 'token-' + fallback.id, user: fallback };
  }

  handleRegister(name, email, password, experienceLevel, preferredSectors) {
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
    const newUser = {
      id: Date.now(),
      name,
      email,
      avatar_initials: initials,
      experience_level: experienceLevel,
      preferred_sectors: (preferredSectors || []).join(', ')
    };

    const users = JSON.parse(localStorage.getItem('pulsewatch_registered_users') || '[]');
    users.push(newUser);
    localStorage.setItem('pulsewatch_registered_users', JSON.stringify(users));

    localStorage.setItem('pulsewatch_user', JSON.stringify(newUser));
    localStorage.setItem('pulsewatch_token', 'token-' + newUser.id);

    return {
      success: true,
      token: 'token-' + newUser.id,
      user: newUser
    };
  }

  // Stock Data
  getAllStocks() {
    return Array.from(this.stocks.values());
  }

  getIndices() {
    return this.indices;
  }

  // Watchlist Operations
  getWatchlists() {
    const wls = this.getStoredWatchlists();
    return wls.map(wl => ({
      ...wl,
      items: wl.items.map(item => ({
        ...item,
        live: this.stocks.get(item.symbol) || {
          symbol: item.symbol,
          company_name: item.symbol,
          last_price: 100,
          change: 0,
          change_pct: 0,
          volume_z_score: 1.0,
          current_volume: 100000,
          sparkline: [100, 100],
          active_signals: []
        }
      }))
    }));
  }

  addWatchlist(name, description) {
    const wls = this.getStoredWatchlists();
    const newWl = {
      id: Date.now(),
      name,
      description: description || '',
      is_default: 0,
      items: []
    };
    wls.push(newWl);
    this.saveStoredWatchlists(wls);
    return newWl;
  }

  addStockToWatchlist(wlId, symbol) {
    const sym = symbol.toUpperCase().trim();
    const wls = this.getStoredWatchlists();
    const targetWl = wls.find(w => w.id === wlId) || wls[0];
    if (!targetWl) throw new Error('Watchlist not found');

    if (targetWl.items.some(i => i.symbol === sym)) {
      return { success: true, item: targetWl.items.find(i => i.symbol === sym) };
    }

    const newItem = {
      id: Date.now(),
      symbol: sym,
      sort_order: targetWl.items.length + 1,
      notes: '',
      custom_tags: [],
      added_at: new Date().toISOString()
    };
    targetWl.items.push(newItem);
    this.saveStoredWatchlists(wls);
    return { success: true, item: newItem };
  }

  removeStockFromWatchlist(wlId, symbol) {
    const sym = symbol.toUpperCase().trim();
    const wls = this.getStoredWatchlists();
    const targetWl = wls.find(w => w.id === wlId);
    if (targetWl) {
      targetWl.items = targetWl.items.filter(i => i.symbol !== sym);
      this.saveStoredWatchlists(wls);
    }
    return { success: true };
  }

  saveStockNotes(wlId, symbol, notes, customTags) {
    const sym = symbol.toUpperCase().trim();
    const wls = this.getStoredWatchlists();
    const targetWl = wls.find(w => w.id === wlId);
    if (targetWl) {
      const item = targetWl.items.find(i => i.symbol === sym);
      if (item) {
        item.notes = notes;
        item.custom_tags = typeof customTags === 'string' ? customTags.split(',').map(t => t.trim()).filter(Boolean) : customTags;
        this.saveStoredWatchlists(wls);
      }
    }
    return { success: true };
  }

  // Dynamic Stock Addition with fuzzy alias resolution
  addNewStock(query) {
    const q = (query || '').trim().toUpperCase();
    const ALIASES = {
      'KALUYN': 'KALYANKJIL',
      'KALUYNA': 'KALYANKJIL',
      'KALYAN': 'KALYANKJIL',
      'KALUYNA JEWEL': 'KALYANKJIL',
      'KALYAN JEWEL': 'KALYANKJIL',
      'KALYAN JEWELLERS': 'KALYANKJIL',
      'KALYANKJIL': 'KALYANKJIL',
      'SENSEX': 'SENSEX',
      'BSE SENSEX': 'SENSEX',
      'BSESN': 'SENSEX',
      '^BSESN': 'SENSEX',
      'TATAMOTORS': 'TATAMOTORS',
      'TATA MOTORS': 'TATAMOTORS'
    };

    const resolvedSym = ALIASES[q] || q.replace('.NS', '').replace('^', '');

    if (this.stocks.has(resolvedSym)) {
      return { success: true, stock: this.stocks.get(resolvedSym), alreadyExists: true };
    }

    // Create synthetic stock entry if not pre-seeded
    const basePrice = Math.floor(150 + Math.random() * 800);
    const newStock = {
      symbol: resolvedSym,
      company_name: `${resolvedSym} India Ltd.`,
      sector: 'NSE Listed',
      industry: 'General Equities',
      market_cap_cr: Math.floor(basePrice * 120),
      base_price: basePrice,
      last_price: Number((basePrice * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2)),
      open_price: basePrice,
      high_price: Number((basePrice * 1.02).toFixed(2)),
      low_price: Number((basePrice * 0.98).toFixed(2)),
      vwap: basePrice,
      bid_price: basePrice - 0.10,
      bid_qty: 1200,
      ask_price: basePrice + 0.10,
      ask_qty: 1400,
      change: 0.50,
      change_pct: 0.25,
      current_volume: 1200000,
      volume_z_score: 1.05,
      fifty_two_week_high: Number((basePrice * 1.3).toFixed(2)),
      fifty_two_week_low: Number((basePrice * 0.7).toFixed(2)),
      pe_ratio: 24.5,
      pb_ratio: 3.2,
      dividend_yield: 0.8,
      roe_pct: 15.0,
      debt_to_equity: 0.4,
      analyst_buy_pct: 75,
      analyst_hold_pct: 15,
      analyst_sell_pct: 10,
      avg_volume_20d: 1200000,
      sector_benchmark: 'NIFTY 50',
      active_signals: [],
      explanation: `${resolvedSym} is trading steady in line with broader market telemetry.`,
      sparkline: [basePrice * 0.99, basePrice, basePrice * 1.01, basePrice]
    };

    this.stocks.set(resolvedSym, newStock);
    return { success: true, stock: newStock, alreadyExists: false };
  }

  // 500ms Live Telemetry Simulation Loop
  startSimulation(onTick) {
    if (this.timer) return;
    this.onTickCallback = onTick;

    this.timer = setInterval(() => {
      const stockList = Array.from(this.stocks.values());
      if (stockList.length === 0) return;

      // Randomly update 2-4 stocks each 500ms cycle
      const countToUpdate = Math.floor(2 + Math.random() * 3);
      const updated = [];

      for (let i = 0; i < countToUpdate; i++) {
        const idx = Math.floor(Math.random() * stockList.length);
        const stock = stockList[idx];

        // Random price fluctuation (-0.2% to +0.2%)
        const delta = (Math.random() - 0.495) * 0.003;
        const newPrice = Number((stock.last_price * (1 + delta)).toFixed(2));
        stock.change = Number((newPrice - stock.base_price).toFixed(2));
        stock.change_pct = Number(((stock.change / stock.base_price) * 100).toFixed(2));
        stock.last_price = newPrice;
        stock.high_price = Math.max(stock.high_price, newPrice);
        stock.low_price = Math.min(stock.low_price, newPrice);
        stock.current_volume += Math.floor(200 + Math.random() * 800);

        // Update sparkline
        stock.sparkline.push(newPrice);
        if (stock.sparkline.length > 24) stock.sparkline.shift();

        updated.push({
          symbol: stock.symbol,
          last_price: stock.last_price,
          change: stock.change,
          change_pct: stock.change_pct,
          current_volume: stock.current_volume,
          volume_z_score: stock.volume_z_score,
          sparkline: stock.sparkline,
          active_signals: stock.active_signals,
          explanation: stock.explanation,
          vwap: stock.vwap,
          bid_price: Number((stock.last_price - 0.10).toFixed(2)),
          ask_price: Number((stock.last_price + 0.10).toFixed(2))
        });
      }

      // Micro update to benchmark indices
      for (const [key, idx] of Object.entries(this.indices)) {
        const delta = (Math.random() - 0.498) * 0.001;
        idx.price = Number((idx.price * (1 + delta)).toFixed(2));
      }

      if (this.onTickCallback) {
        this.onTickCallback({
          type: 'MARKET_TICK',
          timestamp: Date.now(),
          indices: this.indices,
          stocks: updated
        });
      }
    }, 500);
  }

  stopSimulation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Chaos Injection
  triggerChaos(action, symbol = 'INFY') {
    const sym = symbol.toUpperCase();
    const stock = this.stocks.get(sym);

    if (action === 'volume_spike' && stock) {
      stock.volume_z_score = 3.4;
      stock.current_volume = Math.floor(stock.avg_volume_20d * 2.8);
      stock.last_price = Number((stock.last_price * 1.035).toFixed(2));
      stock.change = Number((stock.last_price - stock.base_price).toFixed(2));
      stock.change_pct = Number(((stock.change / stock.base_price) * 100).toFixed(2));
      stock.active_signals = [
        { type: 'VOLUME_SURGE', label: 'Volume Surge (+3.4σ)', description: 'Abnormal volume surge detected by statistical telemetry' }
      ];
      stock.explanation = `⚡ ${stock.company_name} spiked +3.5% with abnormal volume spike (+3.4σ).`;
      return { success: true, message: `Injected volume surge into ${sym}`, stock };
    }

    if (action === 'market_dip') {
      for (const s of this.stocks.values()) {
        if (s.sector.includes('Banking') || s.sector.includes('Technology')) {
          s.last_price = Number((s.last_price * 0.985).toFixed(2));
          s.change = Number((s.last_price - s.base_price).toFixed(2));
          s.change_pct = Number(((s.change / s.base_price) * 100).toFixed(2));
        }
      }
      return { success: true, message: 'Flash pullback injected across Banking & IT' };
    }

    return { success: true };
  }
}

export const clientEngine = new ClientSimulationEngine();
