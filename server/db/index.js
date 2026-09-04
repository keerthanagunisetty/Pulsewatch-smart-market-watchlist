import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data folder exists
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'market_watchlist.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for better concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_initials TEXT,
      experience_level TEXT DEFAULT 'Intermediate',
      preferred_sectors TEXT DEFAULT 'Technology, Banking',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS watchlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watchlist_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      custom_tags TEXT DEFAULT '',
      alert_price_high REAL,
      alert_price_low REAL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
      UNIQUE (watchlist_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS stocks_master (
      symbol TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      sector TEXT NOT NULL,
      industry TEXT DEFAULT 'General',
      market_cap_cr REAL NOT NULL,
      base_price REAL NOT NULL,
      pe_ratio REAL NOT NULL,
      pb_ratio REAL DEFAULT 3.2,
      dividend_yield REAL DEFAULT 1.2,
      roe_pct REAL DEFAULT 18.5,
      debt_to_equity REAL DEFAULT 0.25,
      analyst_buy_pct INTEGER DEFAULT 82,
      analyst_hold_pct INTEGER DEFAULT 12,
      analyst_sell_pct INTEGER DEFAULT 6,
      fifty_two_week_high REAL NOT NULL,
      fifty_two_week_low REAL NOT NULL,
      avg_volume_20d INTEGER NOT NULL,
      next_earnings_date TEXT,
      sector_benchmark TEXT NOT NULL,
      beta REAL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS signals_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      explanation TEXT NOT NULL,
      metric_value REAL,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe schema migrations for existing tables
  try { db.exec("ALTER TABLE users ADD COLUMN experience_level TEXT DEFAULT 'Intermediate';"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN preferred_sectors TEXT DEFAULT 'Technology, Banking';"); } catch (e) {}

  seedData();
}

// Master stock catalog with real market baseline prices and deep financial ratios
const SEED_STOCKS = [
  {
    symbol: 'RELIANCE',
    company_name: 'Reliance Industries Ltd.',
    sector: 'Oil, Gas & Consumable Fuels',
    industry: 'Integrated Refining & Petrochemicals',
    market_cap_cr: 1980500,
    base_price: 2985.40,
    pe_ratio: 27.8,
    pb_ratio: 2.4,
    dividend_yield: 0.35,
    roe_pct: 9.8,
    debt_to_equity: 0.38,
    analyst_buy_pct: 85,
    analyst_hold_pct: 10,
    analyst_sell_pct: 5,
    fifty_two_week_high: 3217.90,
    fifty_two_week_low: 2220.30,
    avg_volume_20d: 5850000,
    next_earnings_date: '2026-09-18',
    sector_benchmark: 'NIFTY ENERGY',
    beta: 1.05
  },
  {
    symbol: 'TCS',
    company_name: 'Tata Consultancy Services',
    sector: 'Information Technology',
    industry: 'IT Services & Software Consulting',
    market_cap_cr: 1520200,
    base_price: 4235.80,
    pe_ratio: 31.2,
    pb_ratio: 14.8,
    dividend_yield: 2.15,
    roe_pct: 48.2,
    debt_to_equity: 0.0,
    analyst_buy_pct: 78,
    analyst_hold_pct: 15,
    analyst_sell_pct: 7,
    fifty_two_week_high: 4585.00,
    fifty_two_week_low: 3315.00,
    avg_volume_20d: 2150000,
    next_earnings_date: '2026-09-12',
    sector_benchmark: 'NIFTY IT',
    beta: 0.88
  },
  {
    symbol: 'INFY',
    company_name: 'Infosys Limited',
    sector: 'Information Technology',
    industry: 'Digital Services & Consulting',
    market_cap_cr: 812400,
    base_price: 1942.50,
    pe_ratio: 28.6,
    pb_ratio: 9.2,
    dividend_yield: 2.40,
    roe_pct: 32.5,
    debt_to_equity: 0.0,
    analyst_buy_pct: 88,
    analyst_hold_pct: 8,
    analyst_sell_pct: 4,
    fifty_two_week_high: 1990.00,
    fifty_two_week_low: 1358.35,
    avg_volume_20d: 6850000,
    next_earnings_date: '2026-09-08',
    sector_benchmark: 'NIFTY IT',
    beta: 1.15
  },
  {
    symbol: 'HDFCBANK',
    company_name: 'HDFC Bank Ltd.',
    sector: 'Banking & Financials',
    industry: 'Private Commercial Banking',
    market_cap_cr: 1265000,
    base_price: 1658.20,
    pe_ratio: 18.2,
    pb_ratio: 2.7,
    dividend_yield: 1.18,
    roe_pct: 16.4,
    debt_to_equity: 0.85,
    analyst_buy_pct: 92,
    analyst_hold_pct: 6,
    analyst_sell_pct: 2,
    fifty_two_week_high: 1794.00,
    fifty_two_week_low: 1363.55,
    avg_volume_20d: 15200000,
    next_earnings_date: '2026-09-22',
    sector_benchmark: 'NIFTY BANK',
    beta: 1.02
  },
  {
    symbol: 'ICICIBANK',
    company_name: 'ICICI Bank Ltd.',
    sector: 'Banking & Financials',
    industry: 'Private Commercial Banking',
    market_cap_cr: 882000,
    base_price: 1248.90,
    pe_ratio: 17.5,
    pb_ratio: 3.1,
    dividend_yield: 0.80,
    roe_pct: 18.9,
    debt_to_equity: 0.90,
    analyst_buy_pct: 95,
    analyst_hold_pct: 4,
    analyst_sell_pct: 1,
    fifty_two_week_high: 1300.00,
    fifty_two_week_low: 912.00,
    avg_volume_20d: 12500000,
    next_earnings_date: '2026-09-24',
    sector_benchmark: 'NIFTY BANK',
    beta: 1.08
  },
  {
    symbol: 'TATAMOTORS',
    company_name: 'Tata Motors Ltd.',
    sector: 'Automobile',
    industry: 'Commercial & Passenger EV Vehicles',
    market_cap_cr: 405000,
    base_price: 994.60,
    pe_ratio: 10.2,
    pb_ratio: 4.2,
    dividend_yield: 0.60,
    roe_pct: 35.2,
    debt_to_equity: 0.62,
    analyst_buy_pct: 82,
    analyst_hold_pct: 12,
    analyst_sell_pct: 6,
    fifty_two_week_high: 1179.00,
    fifty_two_week_low: 602.00,
    avg_volume_20d: 9400000,
    next_earnings_date: '2026-09-15',
    sector_benchmark: 'NIFTY AUTO',
    beta: 1.35
  },
  {
    symbol: 'ITC',
    company_name: 'ITC Limited',
    sector: 'FMCG',
    industry: 'Diversified Conglomerate & FMCG',
    market_cap_cr: 635000,
    base_price: 508.35,
    pe_ratio: 28.5,
    pb_ratio: 8.4,
    dividend_yield: 3.25,
    roe_pct: 30.5,
    debt_to_equity: 0.0,
    analyst_buy_pct: 84,
    analyst_hold_pct: 12,
    analyst_sell_pct: 4,
    fifty_two_week_high: 528.00,
    fifty_two_week_low: 399.30,
    avg_volume_20d: 11200000,
    next_earnings_date: '2026-09-30',
    sector_benchmark: 'NIFTY FMCG',
    beta: 0.62
  },
  {
    symbol: 'BHARTIARTL',
    company_name: 'Bharti Airtel Ltd.',
    sector: 'Telecommunication',
    industry: 'Telecom Services & 5G Infrastructure',
    market_cap_cr: 935000,
    base_price: 1634.00,
    pe_ratio: 68.5,
    pb_ratio: 8.9,
    dividend_yield: 0.48,
    roe_pct: 15.8,
    debt_to_equity: 1.45,
    analyst_buy_pct: 90,
    analyst_hold_pct: 8,
    analyst_sell_pct: 2,
    fifty_two_week_high: 1680.00,
    fifty_two_week_low: 855.00,
    avg_volume_20d: 5200000,
    next_earnings_date: '2026-09-19',
    sector_benchmark: 'NIFTY 50',
    beta: 0.78
  },
  {
    symbol: 'SBIN',
    company_name: 'State Bank of India',
    sector: 'Banking & Financials',
    industry: 'Public Sector Commercial Banking',
    market_cap_cr: 735000,
    base_price: 824.50,
    pe_ratio: 10.4,
    pb_ratio: 1.6,
    dividend_yield: 1.65,
    roe_pct: 17.2,
    debt_to_equity: 1.10,
    analyst_buy_pct: 88,
    analyst_hold_pct: 8,
    analyst_sell_pct: 4,
    fifty_two_week_high: 912.00,
    fifty_two_week_low: 555.20,
    avg_volume_20d: 17800000,
    next_earnings_date: '2026-09-25',
    sector_benchmark: 'NIFTY BANK',
    beta: 1.22
  },
  {
    symbol: 'LT',
    company_name: 'Larsen & Toubro Ltd.',
    sector: 'Construction & Capital Goods',
    industry: 'EPC & Infrastructure Engineering',
    market_cap_cr: 518000,
    base_price: 3698.00,
    pe_ratio: 37.8,
    pb_ratio: 5.6,
    dividend_yield: 0.92,
    roe_pct: 15.4,
    debt_to_equity: 0.78,
    analyst_buy_pct: 86,
    analyst_hold_pct: 10,
    analyst_sell_pct: 4,
    fifty_two_week_high: 3919.00,
    fifty_two_week_low: 2860.00,
    avg_volume_20d: 2400000,
    next_earnings_date: '2026-09-28',
    sector_benchmark: 'NIFTY INFRA',
    beta: 1.04
  },
  {
    symbol: 'SUNPHARMA',
    company_name: 'Sun Pharmaceutical Industries',
    sector: 'Healthcare & Pharma',
    industry: 'Specialty Pharmaceuticals',
    market_cap_cr: 448000,
    base_price: 1856.00,
    pe_ratio: 41.5,
    pb_ratio: 6.8,
    dividend_yield: 0.75,
    roe_pct: 16.8,
    debt_to_equity: 0.05,
    analyst_buy_pct: 80,
    analyst_hold_pct: 14,
    analyst_sell_pct: 6,
    fifty_two_week_high: 1910.00,
    fifty_two_week_low: 1110.00,
    avg_volume_20d: 2200000,
    next_earnings_date: '2026-09-29',
    sector_benchmark: 'NIFTY PHARMA',
    beta: 0.58
  },
  {
    symbol: 'KOTAKBANK',
    company_name: 'Kotak Mahindra Bank',
    sector: 'Banking & Financials',
    industry: 'Private Commercial Banking',
    market_cap_cr: 378000,
    base_price: 1828.50,
    pe_ratio: 21.0,
    pb_ratio: 2.8,
    dividend_yield: 0.12,
    roe_pct: 14.2,
    debt_to_equity: 0.75,
    analyst_buy_pct: 76,
    analyst_hold_pct: 18,
    analyst_sell_pct: 6,
    fifty_two_week_high: 1925.00,
    fifty_two_week_low: 1544.00,
    avg_volume_20d: 3900000,
    next_earnings_date: '2026-09-21',
    sector_benchmark: 'NIFTY BANK',
    beta: 0.95
  },
  {
    symbol: 'WIPRO',
    company_name: 'Wipro Limited',
    sector: 'Information Technology',
    industry: 'IT Consulting & System Integration',
    market_cap_cr: 304000,
    base_price: 546.80,
    pe_ratio: 25.8,
    pb_ratio: 3.6,
    dividend_yield: 0.95,
    roe_pct: 14.8,
    debt_to_equity: 0.15,
    analyst_buy_pct: 55,
    analyst_hold_pct: 30,
    analyst_sell_pct: 15,
    fifty_two_week_high: 580.00,
    fifty_two_week_low: 375.00,
    avg_volume_20d: 5300000,
    next_earnings_date: '2026-09-11',
    sector_benchmark: 'NIFTY IT',
    beta: 1.10
  },
  {
    symbol: 'MARUTI',
    company_name: 'Maruti Suzuki India',
    sector: 'Automobile',
    industry: 'Passenger Vehicles Manufacturing',
    market_cap_cr: 394000,
    base_price: 12540.00,
    pe_ratio: 28.2,
    pb_ratio: 4.8,
    dividend_yield: 1.05,
    roe_pct: 17.5,
    debt_to_equity: 0.02,
    analyst_buy_pct: 84,
    analyst_hold_pct: 12,
    analyst_sell_pct: 4,
    fifty_two_week_high: 13680.00,
    fifty_two_week_low: 9735.00,
    avg_volume_20d: 510000,
    next_earnings_date: '2026-09-26',
    sector_benchmark: 'NIFTY AUTO',
    beta: 0.85
  },
  {
    symbol: 'TITAN',
    company_name: 'Titan Company Ltd.',
    sector: 'Consumer Discretionary',
    industry: 'Jewellery, Watches & Lifestyle Retail',
    market_cap_cr: 326000,
    base_price: 3642.00,
    pe_ratio: 86.2,
    pb_ratio: 24.5,
    dividend_yield: 0.32,
    roe_pct: 31.0,
    debt_to_equity: 0.65,
    analyst_buy_pct: 75,
    analyst_hold_pct: 15,
    analyst_sell_pct: 10,
    fifty_two_week_high: 3886.00,
    fifty_two_week_low: 3055.00,
    avg_volume_20d: 1020000,
    next_earnings_date: '2026-09-27',
    sector_benchmark: 'NIFTY CONSUMPTION',
    beta: 0.92
  },
  {
    symbol: 'BAJFINANCE',
    company_name: 'Bajaj Finance Ltd.',
    sector: 'Financial Services',
    industry: 'Non-Banking Financial Lending (NBFC)',
    market_cap_cr: 452000,
    base_price: 7285.00,
    pe_ratio: 29.8,
    pb_ratio: 6.2,
    dividend_yield: 0.52,
    roe_pct: 22.4,
    debt_to_equity: 3.45,
    analyst_buy_pct: 82,
    analyst_hold_pct: 12,
    analyst_sell_pct: 6,
    fifty_two_week_high: 8192.00,
    fifty_two_week_low: 6160.00,
    avg_volume_20d: 1150000,
    next_earnings_date: '2026-09-23',
    sector_benchmark: 'NIFTY FIN SERVICE',
    beta: 1.25
  },
  {
    symbol: 'ASIANPAINT',
    company_name: 'Asian Paints Ltd.',
    sector: 'Consumer Discretionary',
    industry: 'Paints & Coatings',
    market_cap_cr: 288000,
    base_price: 2965.00,
    pe_ratio: 53.4,
    pb_ratio: 16.5,
    dividend_yield: 1.15,
    roe_pct: 32.8,
    debt_to_equity: 0.12,
    analyst_buy_pct: 65,
    analyst_hold_pct: 22,
    analyst_sell_pct: 13,
    fifty_two_week_high: 3422.00,
    fifty_two_week_low: 2670.00,
    avg_volume_20d: 1250000,
    next_earnings_date: '2026-10-04',
    sector_benchmark: 'NIFTY CONSUMPTION',
    beta: 0.72
  },
  {
    symbol: 'HCLTECH',
    company_name: 'HCL Technologies',
    sector: 'Information Technology',
    industry: 'IT Services & Product Engineering',
    market_cap_cr: 486000,
    base_price: 1795.00,
    pe_ratio: 27.9,
    pb_ratio: 7.2,
    dividend_yield: 3.10,
    roe_pct: 26.5,
    debt_to_equity: 0.08,
    analyst_buy_pct: 80,
    analyst_hold_pct: 14,
    analyst_sell_pct: 6,
    fifty_two_week_high: 1850.00,
    fifty_two_week_low: 1200.00,
    avg_volume_20d: 2650000,
    next_earnings_date: '2026-09-14',
    sector_benchmark: 'NIFTY IT',
    beta: 0.94
  },
  {
    symbol: 'ADANIENT',
    company_name: 'Adani Enterprises Ltd.',
    sector: 'Metals & Mining / Conglomerate',
    industry: 'Airports, Energy & Resource Management',
    market_cap_cr: 355000,
    base_price: 3062.00,
    pe_ratio: 89.5,
    pb_ratio: 8.5,
    dividend_yield: 0.05,
    roe_pct: 10.2,
    debt_to_equity: 1.65,
    analyst_buy_pct: 60,
    analyst_hold_pct: 25,
    analyst_sell_pct: 15,
    fifty_two_week_high: 3450.00,
    fifty_two_week_low: 2140.00,
    avg_volume_20d: 2950000,
    next_earnings_date: '2026-10-02',
    sector_benchmark: 'NIFTY 50',
    beta: 1.85
  },
  {
    symbol: 'AXISBANK',
    company_name: 'Axis Bank Ltd.',
    sector: 'Banking & Financials',
    industry: 'Private Commercial Banking',
    market_cap_cr: 366000,
    base_price: 1205.00,
    pe_ratio: 13.9,
    pb_ratio: 2.1,
    dividend_yield: 0.10,
    roe_pct: 16.5,
    debt_to_equity: 0.92,
    analyst_buy_pct: 88,
    analyst_hold_pct: 9,
    analyst_sell_pct: 3,
    fifty_two_week_high: 1339.00,
    fifty_two_week_low: 933.00,
    avg_volume_20d: 8200000,
    next_earnings_date: '2026-09-20',
    sector_benchmark: 'NIFTY BANK',
    beta: 1.18
  },
  {
    symbol: 'NTPC',
    company_name: 'NTPC Limited',
    sector: 'Power & Utilities',
    industry: 'Thermal & Renewable Power Generation',
    market_cap_cr: 402000,
    base_price: 418.50,
    pe_ratio: 17.8,
    pb_ratio: 2.4,
    dividend_yield: 2.25,
    roe_pct: 14.5,
    debt_to_equity: 1.35,
    analyst_buy_pct: 88,
    analyst_hold_pct: 8,
    analyst_sell_pct: 4,
    fifty_two_week_high: 440.00,
    fifty_two_week_low: 220.00,
    avg_volume_20d: 14200000,
    next_earnings_date: '2026-10-08',
    sector_benchmark: 'NIFTY ENERGY',
    beta: 0.95
  },
  {
    symbol: 'M&M',
    company_name: 'Mahindra & Mahindra',
    sector: 'Automobile',
    industry: 'SUVs & Farm Equipment Manufacturing',
    market_cap_cr: 352000,
    base_price: 2810.00,
    pe_ratio: 26.8,
    pb_ratio: 5.2,
    dividend_yield: 0.85,
    roe_pct: 21.0,
    debt_to_equity: 0.55,
    analyst_buy_pct: 86,
    analyst_hold_pct: 10,
    analyst_sell_pct: 4,
    fifty_two_week_high: 3014.00,
    fifty_two_week_low: 1520.00,
    avg_volume_20d: 3250000,
    next_earnings_date: '2026-09-17',
    sector_benchmark: 'NIFTY AUTO',
    beta: 1.12
  },
  {
    symbol: 'POWERGRID',
    company_name: 'Power Grid Corporation of India',
    sector: 'Power & Utilities',
    industry: 'Electric Power Transmission Utility',
    market_cap_cr: 320000,
    base_price: 342.50,
    pe_ratio: 19.1,
    pb_ratio: 3.5,
    dividend_yield: 3.40,
    roe_pct: 19.8,
    debt_to_equity: 1.40,
    analyst_buy_pct: 82,
    analyst_hold_pct: 14,
    analyst_sell_pct: 4,
    fifty_two_week_high: 366.00,
    fifty_two_week_low: 190.00,
    avg_volume_20d: 11800000,
    next_earnings_date: '2026-10-05',
    sector_benchmark: 'NIFTY ENERGY',
    beta: 0.70
  },
  {
    symbol: 'TATASTEEL',
    company_name: 'Tata Steel Ltd.',
    sector: 'Metals & Mining',
    industry: 'Flat & Long Steel Manufacturing',
    market_cap_cr: 194000,
    base_price: 155.40,
    pe_ratio: 42.5,
    pb_ratio: 2.1,
    dividend_yield: 2.30,
    roe_pct: 5.2,
    debt_to_equity: 0.88,
    analyst_buy_pct: 72,
    analyst_hold_pct: 18,
    analyst_sell_pct: 10,
    fifty_two_week_high: 184.60,
    fifty_two_week_low: 114.60,
    avg_volume_20d: 39500000,
    next_earnings_date: '2026-09-30',
    sector_benchmark: 'NIFTY METALS',
    beta: 1.40
  },
  {
    symbol: 'ZOMATO',
    company_name: 'Zomato Limited',
    sector: 'New Age Tech / Consumer',
    industry: 'Food Delivery & Quick Commerce (Blinkit)',
    market_cap_cr: 252000,
    base_price: 282.60,
    pe_ratio: 135.0,
    pb_ratio: 11.5,
    dividend_yield: 0.0,
    roe_pct: 8.5,
    debt_to_equity: 0.01,
    analyst_buy_pct: 90,
    analyst_hold_pct: 6,
    analyst_sell_pct: 4,
    fifty_two_week_high: 298.00,
    fifty_two_week_low: 95.00,
    avg_volume_20d: 44000000,
    next_earnings_date: '2026-09-16',
    sector_benchmark: 'NIFTY 50',
    beta: 1.60
  },
  {
    symbol: 'PAYTM',
    company_name: 'One97 Communications Ltd.',
    sector: 'Fintech & Payments',
    industry: 'Digital Payments & Financial Services',
    market_cap_cr: 458000,
    base_price: 698.50,
    pe_ratio: -1.0,
    pb_ratio: 3.4,
    dividend_yield: 0.0,
    roe_pct: -6.2,
    debt_to_equity: 0.04,
    analyst_buy_pct: 68,
    analyst_hold_pct: 20,
    analyst_sell_pct: 12,
    fifty_two_week_high: 998.00,
    fifty_two_week_low: 310.00,
    avg_volume_20d: 10200000,
    next_earnings_date: '2026-09-10',
    sector_benchmark: 'NIFTY FIN SERVICE',
    beta: 1.75
  },
  {
    symbol: 'KALYANKJIL',
    company_name: 'Kalyan Jewellers India Limited',
    sector: 'Consumer / FMCG',
    industry: 'Gems, Jewellery & Luxury Goods',
    market_cap_cr: 61500,
    base_price: 597.85,
    pe_ratio: 54.2,
    pb_ratio: 7.8,
    dividend_yield: 0.35,
    roe_pct: 18.5,
    debt_to_equity: 0.45,
    analyst_buy_pct: 85,
    analyst_hold_pct: 10,
    analyst_sell_pct: 5,
    fifty_two_week_high: 794.00,
    fifty_two_week_low: 280.00,
    avg_volume_20d: 8500000,
    next_earnings_date: '2026-09-15',
    sector_benchmark: 'NIFTY 50',
    beta: 1.25
  },
  {
    symbol: 'SENSEX',
    company_name: 'S&P BSE SENSEX Index',
    sector: 'Benchmark Index',
    industry: 'BSE Index',
    market_cap_cr: 41000000,
    base_price: 76681.08,
    pe_ratio: 24.1,
    pb_ratio: 3.5,
    dividend_yield: 1.20,
    roe_pct: 16.0,
    debt_to_equity: 0.30,
    analyst_buy_pct: 90,
    analyst_hold_pct: 8,
    analyst_sell_pct: 2,
    fifty_two_week_high: 85978.00,
    fifty_two_week_low: 70800.00,
    avg_volume_20d: 50000000,
    next_earnings_date: null,
    sector_benchmark: 'NIFTY 50',
    beta: 1.00
  }
];

function seedData() {
  // Check if we need to update/re-seed stocks
  const countRow = db.prepare('SELECT COUNT(*) as count FROM stocks_master').get();
  // Clear and update to ensure new schema columns exist
  try {
    db.prepare('SELECT pb_ratio FROM stocks_master LIMIT 1').get();
  } catch (e) {
    // Column missing, drop and recreate
    db.exec('DROP TABLE IF EXISTS stocks_master;');
    initSchema();
    return;
  }

  if (countRow.count === 0) {
    console.log('[DB] Seeding master stocks...');
    const insertStock = db.prepare(`
      INSERT INTO stocks_master (
        symbol, company_name, sector, industry, market_cap_cr, base_price, pe_ratio,
        pb_ratio, dividend_yield, roe_pct, debt_to_equity, analyst_buy_pct,
        analyst_hold_pct, analyst_sell_pct, fifty_two_week_high, fifty_two_week_low,
        avg_volume_20d, next_earnings_date, sector_benchmark, beta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of SEED_STOCKS) {
      insertStock.run(
        s.symbol, s.company_name, s.sector, s.industry, s.market_cap_cr, s.base_price, s.pe_ratio,
        s.pb_ratio, s.dividend_yield, s.roe_pct, s.debt_to_equity, s.analyst_buy_pct,
        s.analyst_hold_pct, s.analyst_sell_pct, s.fifty_two_week_high, s.fifty_two_week_low,
        s.avg_volume_20d, s.next_earnings_date, s.sector_benchmark, s.beta
      );
    }
    console.log(`[DB] Seeded ${SEED_STOCKS.length} master stocks with deep financial metrics.`);
  }

  // Seed default Demo Investor user if not exists
  const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@groww.in');
  let userId;
  if (!demoUser) {
    console.log('[DB] Creating default Demo User for judges...');
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, avatar_initials, experience_level, preferred_sectors)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const defaultHash = '$2a$10$wN9aO9vA48N6wF9d1t1XqOPxN6Gq1V6K6c8n8q9wX0Y1Z2a3b4c5d';
    const info = insertUser.run('Priya Sharma (Judge Demo)', 'demo@groww.in', defaultHash, 'PS', 'Lead Quant / Pro', 'Technology, Banking & Financials');
    userId = Number(info.lastInsertRowid);

    const insertWl = db.prepare(`
      INSERT INTO watchlists (user_id, name, description, is_default)
      VALUES (?, ?, ?, ?)
    `);

    const wl1 = insertWl.run(userId, 'High Momentum & Alpha', 'Active movers exhibiting volume surges and sector alpha', 1);
    const wl2 = insertWl.run(userId, 'Core Nifty Bluechips', 'Stable large-cap dividend and compounders', 0);
    const wl3 = insertWl.run(userId, 'Tech & Growth Radar', 'High beta technology & digital consumer leaders', 0);

    const insertItem = db.prepare(`
      INSERT INTO watchlist_items (watchlist_id, symbol, sort_order, notes, custom_tags, alert_price_high, alert_price_low)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Watchlist 1 items
    insertItem.run(Number(wl1.lastInsertRowid), 'INFY', 0, 'Earnings coming up. Watching for volume breakout above 1950.', 'Catalyst,Earnings', 1980, 1850);
    insertItem.run(Number(wl1.lastInsertRowid), 'TATAMOTORS', 1, 'EV market share expanding. Solid order book.', 'EV,Momentum', 1050, 920);
    insertItem.run(Number(wl1.lastInsertRowid), 'BHARTIARTL', 2, 'ARPU expansion and 5G monetization driving margin expansion.', 'Telecom,Defensive', 1650, 1550);
    insertItem.run(Number(wl1.lastInsertRowid), 'ZOMATO', 3, 'Quick commerce (Blinkit) unit economics turning profitable.', 'High-Beta,Growth', 300, 240);
    insertItem.run(Number(wl1.lastInsertRowid), 'PAYTM', 4, 'Payment aggregator license turnaround play. Track closely.', 'Turnaround,High-Risk', 750, 600);

    // Watchlist 2 items
    insertItem.run(Number(wl2.lastInsertRowid), 'RELIANCE', 0, 'New energy demerger catalyst in H2.', 'Core,Bluechip', 3100, 2800);
    insertItem.run(Number(wl2.lastInsertRowid), 'TCS', 1, 'BFSI deal ramp-ups in North America.', 'Bluechip,Dividend', 4400, 3900);
    insertItem.run(Number(wl2.lastInsertRowid), 'HDFCBANK', 2, 'Merger synergy digestion ongoing. Valuation near historical support.', 'Banking,Value', 1750, 1500);
    insertItem.run(Number(wl2.lastInsertRowid), 'ITC', 3, 'Hotel business demerger unlock. Robust cash flows.', 'FMCG,High-Yield', 530, 480);
    insertItem.run(Number(wl2.lastInsertRowid), 'LT', 4, 'Record domestic & Middle East order book.', 'Infra,Capex', 3900, 3400);

    // Watchlist 3 items
    insertItem.run(Number(wl3.lastInsertRowid), 'INFY', 0, 'Q2 guidance upgrade expected.', 'Tech', 2000, 1800);
    insertItem.run(Number(wl3.lastInsertRowid), 'HCLTECH', 1, 'Leading dividend yield among tier-1 tech.', 'Tech,Yield', 1850, 1650);
    insertItem.run(Number(wl3.lastInsertRowid), 'WIPRO', 2, 'Consulting turnaround under new CEO.', 'Tech,Lagging', 580, 500);
    insertItem.run(Number(wl3.lastInsertRowid), 'ZOMATO', 3, 'GOV growth outpacing delivery peers.', 'Consumer Tech', 310, 250);

    console.log('[DB] Seeded demo watchlists and curated stocks for judges.');
  }
}

// Run schema initialization
initSchema();

export default db;
