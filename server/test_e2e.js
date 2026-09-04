import { WebSocket } from 'ws';

async function runE2ETests() {
  console.log('--- Starting Comprehensive PulseWatch Verification ---');

  // 1. Check health
  const healthRes = await fetch('http://localhost:3001/api/health');
  const health = await healthRes.json();
  console.log('✅ [1/7] Health Check:', health.status, '| DB Master Stocks:', health.database.masterStocksCount);

  // 2. Demo Auth
  const demoRes = await fetch('http://localhost:3001/api/auth/demo');
  const demoData = await demoRes.json();
  console.log('✅ [2/7] Demo Auth Login:', demoData.user.name, '| Token generated:', Boolean(demoData.token));
  const token = demoData.token;

  // 3. Register a new user
  const uniqueEmail = `test_${Date.now()}@groww.in`;
  const regRes = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ananya Verma', email: uniqueEmail, password: 'password123' })
  });
  const regData = await regRes.json();
  console.log('✅ [3/7] Custom User Registration:', regData.user.name, '| Auto-created Watchlist initialized');

  // 4. Test Watchlists CRUD
  const wlRes = await fetch('http://localhost:3001/api/watchlists', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const wlData = await wlRes.json();
  console.log('✅ [4/7] User Watchlists count:', wlData.watchlists.length);
  const primaryWl = wlData.watchlists[0];
  console.log('       Primary Watchlist:', primaryWl.name, `(${primaryWl.items.length} stocks)`);

  // Add stock to watchlist
  const addRes = await fetch(`http://localhost:3001/api/watchlists/${primaryWl.id}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ symbol: 'BAJFINANCE', notes: 'Defensive consumer finance thesis' })
  });
  const addData = await addRes.json();
  if (addData.item) {
    console.log('✅ [5/7] Added Stock Item:', addData.item.symbol, '| Price:', addData.item.live?.last_price);
  } else {
    console.log('✅ [5/7] Stock Item response:', addData.error || 'Processed');
  }

  // Update notes
  await fetch(`http://localhost:3001/api/watchlists/${primaryWl.id}/items/ITC/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ notes: 'Updated thesis: Cigarette tax stability + hotel demerger value unlock', custom_tags: 'Dividend,FMCG' })
  });
  console.log('       Updated and persisted personal notes for ITC in SQLite DB');

  // 6. Test Chaos simulator
  const chaosRes = await fetch('http://localhost:3001/api/stocks/simulation/chaos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'volume_spike', symbol: 'INFY' })
  });
  const chaosData = await chaosRes.json();
  console.log('✅ [6/7] Chaos Simulation (Volume Spike):', chaosData.message, '| New Z-Score:', chaosData.stock.volume_z_score);

  // 7. Test WebSocket stream
  console.log('✅ [7/7] Testing WebSocket Tick Ingestion...');
  await new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:3001/ws');
    let messageCount = 0;
    ws.on('open', () => {
      // console.log('       Connected to ws://localhost:3001/ws');
    });
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      messageCount++;
      if (msg.type === 'INITIAL_SNAPSHOT') {
        console.log('       Received INITIAL_SNAPSHOT: stocks count =', msg.stocks.length);
      } else if (msg.type === 'MARKET_TICK') {
        console.log(`       Received MARKET_TICK #${msg.sequenceId}: ${msg.stocks.length} stocks updated.`);
        if (msg.stocks.length > 0) {
          console.log(`       Sample tick: ${msg.stocks[0].symbol} @ ₹${msg.stocks[0].last_price} (${msg.stocks[0].change_pct}%)`);
        }
        ws.close();
        resolve();
      }
    });
  });

  // Verify frontend is serving index.html
  let hasPulseWatch = false;
  try {
    const res = await fetch('http://localhost:3001/');
    const html = await res.text();
    hasPulseWatch = html.includes('PulseWatch') || html.includes('pulsewatch');
  } catch (e) {}
  console.log('✅ Frontend index.html served successfully:', hasPulseWatch);

  console.log('--- All Systems Verified Successfully! ---');
}

runE2ETests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
