// ==========================================================================
// Dashboard Metrics & Chart.js Analytics Manager (Healthcare SaaS Dark Theme)
// ==========================================================================

import Chart from 'chart.js/auto';
import { getRoomsAndBedsForHospital } from './hospitalService.js';

let bedStatusChartInstance = null;
let departmentChartInstance = null;
let revenueDeptChartInstance = null;
let revenueRoomTypeChartInstance = null;
let occupancyTrendChartInstance = null;

// Caches for Live Visualizations
const sparklineCache = {};
const trendTimelineCache = [];

/**
 * Main dashboard renderer called by real-time Firestore triggers
 */
export function updateDashboard(hospitals = [], bookings = []) {
  // 1. Calculate Aggregate Metrics
  let totalHospitals = hospitals.length;
  let totalBeds = 0;
  let occupiedBeds = 0;
  let availableBeds = 0;
  let criticalCount = 0;

  hospitals.forEach(h => {
    const total = parseInt(h.totalBeds, 10) || 0;
    const occupied = parseInt(h.occupiedBeds, 10) || 0;
    const avail = parseInt(h.availableBeds, 10) || Math.max(0, total - occupied);

    totalBeds += total;
    occupiedBeds += occupied;
    availableBeds += avail;

    if (h.status === 'Critical' || h.status === 'Full' || (total > 0 && (avail / total) < 0.10)) {
      criticalCount++;
    }
  });

  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const availablePercent = totalBeds > 0 ? 100 - occupancyRate : 100;

  // Calculate Available Rooms dynamically
  let totalAvailableRooms = 0;
  hospitals.forEach(h => {
    const rooms = getRoomsAndBedsForHospital(h, bookings);
    rooms.forEach(r => {
      const hasAvail = r.beds.some(b => b.status === 'Available');
      if (hasAvail) totalAvailableRooms++;
    });
  });

  // Calculate Active Patients & Revenue
  const activePatients = bookings.filter(b => b.bookingStatus === 'Admitted');
  const activePatientsCount = activePatients.length;

  const totalRevenue = bookings.reduce((sum, b) => sum + (parseInt(b.estimatedCost, 10) || 0), 0);
  const totalDischarged = bookings.filter(b => b.bookingStatus === 'Discharged').length;

  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayAdmissionsCount = bookings.filter(b => b.admissionDate === todayDateStr).length;
  const todayDischargesCount = bookings.filter(b => b.bookingStatus === 'Discharged' && b.actualDischargeDate === todayDateStr).length;

  // 2. Update KPI Counter Elements with Smooth Animations
  updateNumberWithAnimation('metricTotalHospitals', totalHospitals);
  updateNumberWithAnimation('metricTotalBeds', totalBeds);
  updateNumberWithAnimation('metricOccupiedBeds', occupiedBeds);
  updateNumberWithAnimation('metricAvailableBeds', availableBeds);
  updateNumberWithAnimation('metricCriticalHospitals', criticalCount);
  updateNumberWithAnimation('metricAvailableRooms', totalAvailableRooms);
  updateNumberWithAnimation('metricActivePatients', activePatientsCount);
  updateNumberWithAnimation('metricEstimatedRevenue', totalRevenue);

  // Update other views and text spans
  const occupancyRateEl = document.getElementById('metricOccupancyRate');
  if (occupancyRateEl) {
    occupancyRateEl.innerHTML = `<span class="pulse-dot"></span> ${occupancyRate}% Occupancy Rate`;
  }

  // Admissions page counters
  const cardActivePatientsEl = document.getElementById('cardActivePatients');
  const cardTodayAdmissionsEl = document.getElementById('cardTodayAdmissions');
  const cardTodayDischargesEl = document.getElementById('cardTodayDischarges');
  const cardEstRevenueEl = document.getElementById('cardEstRevenue');

  if (cardActivePatientsEl) cardActivePatientsEl.textContent = activePatientsCount.toLocaleString();
  if (cardTodayAdmissionsEl) cardTodayAdmissionsEl.textContent = todayAdmissionsCount.toLocaleString();
  if (cardTodayDischargesEl) cardTodayDischargesEl.textContent = todayDischargesCount.toLocaleString();
  if (cardEstRevenueEl) cardEstRevenueEl.textContent = `₹${totalRevenue.toLocaleString()}`;

  // Reports Specific counters
  const rptTotalAdmissionsEl = document.getElementById('rptTotalAdmissions');
  const rptDischargedPatientsEl = document.getElementById('rptDischargedPatients');
  const rptTotalRevenueEl = document.getElementById('rptTotalRevenue');

  if (rptTotalAdmissionsEl) rptTotalAdmissionsEl.textContent = bookings.length.toLocaleString();
  if (rptDischargedPatientsEl) rptDischargedPatientsEl.textContent = totalDischarged.toLocaleString();
  if (rptTotalRevenueEl) rptTotalRevenueEl.textContent = `₹${totalRevenue.toLocaleString()}`;

  // 3. Update Progress Bar Segment
  const occupiedProgressSegment = document.getElementById('occupiedProgressSegment');
  const availableProgressSegment = document.getElementById('availableProgressSegment');
  const visualPercentLabel = document.getElementById('visualPercentLabel');

  if (occupiedProgressSegment) occupiedProgressSegment.style.width = `${occupancyRate}%`;
  if (availableProgressSegment) availableProgressSegment.style.width = `${availablePercent}%`;
  if (visualPercentLabel) visualPercentLabel.textContent = `${availablePercent}% Available System-wide`;

  // 4. Render/Update Sparklines for KPI Cards
  updateSparklineData('totalHospitals', totalHospitals);
  updateSparklineData('totalBeds', totalBeds);
  updateSparklineData('occupiedBeds', occupiedBeds);
  updateSparklineData('availableBeds', availableBeds);
  updateSparklineData('criticalAlerts', criticalCount);
  updateSparklineData('availableRooms', totalAvailableRooms);
  updateSparklineData('activePatients', activePatientsCount);
  updateSparklineData('estRevenue', totalRevenue);

  // 5. Update Circular Occupancy Ring
  updateOccupancyRing(occupiedBeds, availableBeds);

  // 6. Update Real-Time Occupancy Trend Chart
  updateOccupancyTrendChart(occupancyRate, availablePercent);

  // 7. Render Dark Theme Charts
  renderBedStatusDoughnutChart(occupiedBeds, availableBeds);
  renderDepartmentBarChart(hospitals);
  renderRevenueDeptChart(bookings);
  renderRevenueRoomTypeChart(bookings);

  // 8. Render Overview Table
  renderDashboardRecentTable(hospitals);
}

/**
 * Animates text counters smoothly
 */
function animateCounter(element, start, end, duration = 800) {
  if (!element) return;
  const isCurrency = element.textContent.trim().includes('₹') || element.id === 'metricEstimatedRevenue';
  const startNum = start;
  const endNum = end;
  
  if (startNum === endNum) {
    element.textContent = isCurrency ? `₹${endNum.toLocaleString()}` : endNum.toLocaleString();
    return;
  }

  let startTime = null;
  function updateNumber(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const current = Math.floor(progress * (endNum - startNum) + startNum);
    element.textContent = isCurrency ? `₹${current.toLocaleString()}` : current.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    } else {
      element.textContent = isCurrency ? `₹${endNum.toLocaleString()}` : endNum.toLocaleString();
    }
  }
  requestAnimationFrame(updateNumber);
}

/**
 * Checks for value changes and flashes container
 */
function updateNumberWithAnimation(elementId, newValue) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  const currentValText = el.textContent.replace(/[^\d]/g, '');
  const currentVal = parseInt(currentValText, 10) || 0;

  if (currentVal !== newValue) {
    const parentCard = el.closest('.metric-card');
    if (parentCard) {
      parentCard.classList.remove('highlight-flash');
      void parentCard.offsetWidth; // Force Reflow
      parentCard.classList.add('highlight-flash');
    }
    animateCounter(el, currentVal, newValue);
  } else {
    const isCurrency = el.textContent.trim().includes('₹') || elementId === 'metricEstimatedRevenue';
    el.textContent = isCurrency ? `₹${newValue.toLocaleString()}` : newValue.toLocaleString();
  }
}

/**
 * Caches and draws micro sparkline graphics
 */
function updateSparklineData(key, newValue) {
  if (!sparklineCache[key]) {
    sparklineCache[key] = [
      Math.round(newValue * 0.95),
      Math.round(newValue * 0.99),
      Math.round(newValue * 0.97),
      Math.round(newValue * 1.02),
      newValue
    ];
  } else {
    const history = sparklineCache[key];
    if (history[history.length - 1] !== newValue) {
      history.push(newValue);
      if (history.length > 8) history.shift();
    }
  }
  drawSparkline(`sparkline-${key}`, sparklineCache[key]);
}

function drawSparkline(canvasId, history) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, rect.width, rect.height);
  if (history.length < 2) return;

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = (max - min) || 1;

  ctx.beginPath();
  ctx.strokeStyle = '#0ea5e9'; // Cyan/Sky blue sparkline
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const stepX = rect.width / (history.length - 1);
  history.forEach((val, idx) => {
    const x = idx * stepX;
    const y = rect.height - 2 - ((val - min) / range) * (rect.height - 4);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw smooth gradient fill under curve
  ctx.lineTo(rect.width, rect.height);
  ctx.lineTo(0, rect.height);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
  gradient.addColorStop(0, 'rgba(14, 165, 233, 0.15)');
  gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
  ctx.fillStyle = gradient;
  ctx.fill();
}

/**
 * Computes SVG circular occupancy properties
 */
function updateOccupancyRing(occupied, available) {
  const total = occupied + available;
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const pctEl = document.getElementById('ringPctVal');
  const countEl = document.getElementById('ringCountVal');
  const fillRing = document.getElementById('ringFillCircle');

  if (pctEl) pctEl.textContent = `${pct}%`;
  if (countEl) countEl.textContent = `${occupied} / ${total} Beds`;

  if (fillRing) {
    const radius = parseFloat(fillRing.getAttribute('r')) || 42;
    const circumference = 2 * Math.PI * radius;
    fillRing.style.strokeDasharray = `${circumference}`;
    const offset = circumference - (pct / 100) * circumference;
    fillRing.style.strokeDashoffset = offset;
  }

  // Update ring legend
  const ringStatOcc = document.getElementById('ringStatOcc');
  const ringStatAvail = document.getElementById('ringStatAvail');
  const ringStatTotal = document.getElementById('ringStatTotal');

  if (ringStatOcc) ringStatOcc.textContent = occupied.toLocaleString();
  if (ringStatAvail) ringStatAvail.textContent = available.toLocaleString();
  if (ringStatTotal) ringStatTotal.textContent = total.toLocaleString();
}

/**
 * Appends current real-time dataset coordinates and plots the modern line trend chart
 */
function updateOccupancyTrendChart(occupiedPct, availablePct) {
  const canvas = document.getElementById('occupancyTrendChart');
  if (!canvas) return;

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Push new data point if the last recorded status differs or timeline is empty
  if (trendTimelineCache.length === 0 || trendTimelineCache[trendTimelineCache.length - 1].occ !== occupiedPct) {
    trendTimelineCache.push({ time: currentTime, occ: occupiedPct, avail: availablePct });
    if (trendTimelineCache.length > 8) trendTimelineCache.shift();
  }

  // Fallback default points for initial visualization load
  if (trendTimelineCache.length < 3) {
    const base = [
      { time: '10:00:00 AM', occ: Math.max(0, occupiedPct - 4), avail: Math.min(100, availablePct + 4) },
      { time: '11:00:00 AM', occ: Math.max(0, occupiedPct - 2), avail: Math.min(100, availablePct + 2) }
    ];
    base.forEach(p => {
      if (!trendTimelineCache.some(t => t.time === p.time)) trendTimelineCache.unshift(p);
    });
  }

  const labels = trendTimelineCache.map(d => d.time);
  const occData = trendTimelineCache.map(d => d.occ);
  const availData = trendTimelineCache.map(d => d.avail);

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Occupied %',
        data: occData,
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#0ea5e9'
      },
      {
        label: 'Available %',
        data: availData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.04)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#10b981'
      }
    ]
  };

  if (occupancyTrendChartInstance) {
    occupancyTrendChartInstance.data = data;
    occupancyTrendChartInstance.update();
  } else {
    occupancyTrendChartInstance = new Chart(canvas, {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { size: 9 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { size: 9 } },
            max: 100,
            min: 0
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94a3b8', font: { size: 10, weight: '600' } }
          }
        }
      }
    });
  }
}

/**
 * Doughnut status distribution chart
 */
function renderBedStatusDoughnutChart(occupied, available) {
  const canvas = document.getElementById('bedStatusChart');
  if (!canvas) return;

  const data = {
    labels: ['Occupied', 'Available'],
    datasets: [{
      data: [occupied, available],
      backgroundColor: ['#0ea5e9', '#10b981'],
      borderColor: ['#0e1422', '#0e1422'],
      borderWidth: 3,
      hoverOffset: 6
    }]
  };

  if (bedStatusChartInstance) {
    bedStatusChartInstance.data = data;
    bedStatusChartInstance.update();
  } else {
    bedStatusChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 11, weight: '600' } }
          }
        },
        cutout: '76%'
      }
    });
  }
}

/**
 * Department bar counts overview
 */
function renderDepartmentBarChart(hospitals) {
  const canvas = document.getElementById('departmentChart');
  if (!canvas) return;

  const deptMap = {
    'ICU': { occupied: 0, available: 0 },
    'General Ward': { occupied: 0, available: 0 },
    'Emergency': { occupied: 0, available: 0 },
    'Maternity': { occupied: 0, available: 0 },
    'Pediatrics': { occupied: 0, available: 0 },
    'Other': { occupied: 0, available: 0 }
  };

  hospitals.forEach(h => {
    const dept = deptMap[h.department] ? h.department : 'Other';
    const total = parseInt(h.totalBeds, 10) || 0;
    const occ = parseInt(h.occupiedBeds, 10) || 0;
    const avail = parseInt(h.availableBeds, 10) || Math.max(0, total - occ);

    deptMap[dept].occupied += occ;
    deptMap[dept].available += avail;
  });

  const labels = Object.keys(deptMap);
  const occupiedValues = labels.map(d => deptMap[d].occupied);
  const availableValues = labels.map(d => deptMap[d].available);

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Occupied',
        data: occupiedValues,
        backgroundColor: '#0ea5e9',
        borderRadius: 4
      },
      {
        label: 'Available',
        data: availableValues,
        backgroundColor: '#10b981',
        borderRadius: 4
      }
    ]
  };

  if (departmentChartInstance) {
    departmentChartInstance.data = data;
    departmentChartInstance.update();
  } else {
    departmentChartInstance = new Chart(canvas, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: false,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          y: {
            stacked: false,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { size: 11, weight: '600' } }
          }
        }
      }
    });
  }
}

/**
 * Revenue distribution by department
 */
function renderRevenueDeptChart(bookings) {
  const canvas = document.getElementById('revenueDeptChart');
  if (!canvas) return;

  const revMap = {
    'ICU': 0,
    'General Ward': 0,
    'Emergency': 0,
    'Maternity': 0,
    'Pediatrics': 0,
    'Other': 0
  };

  bookings.forEach(b => {
    const dept = revMap[b.department] !== undefined ? b.department : 'Other';
    revMap[dept] += parseInt(b.estimatedCost, 10) || 0;
  });

  const labels = Object.keys(revMap);
  const values = Object.values(revMap);

  const data = {
    labels: labels,
    datasets: [{
      label: 'Revenue (₹)',
      data: values,
      backgroundColor: '#0ea5e9',
      borderColor: '#0ea5e9',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  if (revenueDeptChartInstance) {
    revenueDeptChartInstance.data = data;
    revenueDeptChartInstance.update();
  } else {
    revenueDeptChartInstance = new Chart(canvas, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

/**
 * Revenue distribution by room type
 */
function renderRevenueRoomTypeChart(bookings) {
  const canvas = document.getElementById('revenueRoomTypeChart');
  if (!canvas) return;

  const revMap = {
    'General Ward': 0,
    'Semi-Private': 0,
    'Private Room': 0,
    'ICU': 0,
    'Emergency': 0
  };

  bookings.forEach(b => {
    if (revMap[b.roomType] !== undefined) {
      revMap[b.roomType] += parseInt(b.estimatedCost, 10) || 0;
    }
  });

  const labels = Object.keys(revMap);
  const values = Object.values(revMap);

  const data = {
    labels: labels,
    datasets: [{
      label: 'Revenue (₹)',
      data: values,
      backgroundColor: '#14b8a6',
      borderColor: '#14b8a6',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  if (revenueRoomTypeChartInstance) {
    revenueRoomTypeChartInstance.data = data;
    revenueRoomTypeChartInstance.update();
  } else {
    revenueRoomTypeChartInstance = new Chart(canvas, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

/**
 * Overview dashboard hospitals table
 */
function renderDashboardRecentTable(hospitals) {
  const tbody = document.getElementById('dashboardRecentTableBody');
  if (!tbody) return;

  if (hospitals.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-muted">
          No hospital records available. Click "Seed Demo Data" to load sample data.
        </td>
      </tr>
    `;
    return;
  }

  const recent = hospitals.slice(0, 5);
  tbody.innerHTML = recent.map(h => {
    const badgeClass = getBadgeClass(h.status);
    const updatedTime = formatRelativeTime(h.updatedAt);
    const total = parseInt(h.totalBeds, 10) || 0;
    const occ = parseInt(h.occupiedBeds, 10) || 0;
    const pct = total > 0 ? Math.round((occ / total) * 100) : 0;
    
    // Choose mini occupancy progress bar color based on status
    let barColor = 'var(--primary)';
    if (h.status === 'Critical') barColor = 'var(--accent-orange)';
    if (h.status === 'Full') barColor = 'var(--accent-rose)';
    if (h.status === 'Available') barColor = 'var(--accent-emerald)';

    return `
      <tr class="align-middle">
        <td><strong>${escapeHtml(h.hospitalName)}</strong></td>
        <td>${escapeHtml(h.location)}</td>
        <td><span class="badge badge-subtle">${escapeHtml(h.department)}</span></td>
        <td>${h.totalBeds}</td>
        <td data-label="Occupancy">
          <div class="hosp-occ-mini">
            <span>${h.occupiedBeds}</span>
            <div class="hosp-mini-bar">
              <div class="hosp-mini-bar-fill" style="width: ${pct}%; background-color: ${barColor};"></div>
            </div>
            <span class="text-xs text-muted">(${pct}%)</span>
          </div>
        </td>
        <td><strong class="text-emerald" style="color: var(--status-available-text);">${h.availableBeds}</strong></td>
        <td><span class="badge ${badgeClass}">${h.status}</span></td>
        <td class="text-muted text-sm">${updatedTime}</td>
      </tr>
    `;
  }).join('');
}

export function getBadgeClass(status) {
  switch (status) {
    case 'Available': return 'badge-available';
    case 'Limited': return 'badge-limited';
    case 'Critical': return 'badge-critical';
    case 'Full': return 'badge-full';
    default: return 'badge-subtle';
  }
}

export function formatRelativeTime(isoString) {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';
    const diffSec = Math.floor((new Date() - date) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hrs ago`;
    return date.toLocaleDateString();
  } catch (e) {
    return 'Recently';
  }
}

export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
