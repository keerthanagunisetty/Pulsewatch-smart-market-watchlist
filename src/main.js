// ==========================================================================
// PulseBed Main Application Router & Event Controller (Healthcare SaaS Light Theme)
// ==========================================================================

import { initAuth, isAuthenticated, getCurrentUserRole, getCurrentUserProfile, loginUser, logoutUser, registerUser } from './auth.js';
import { updateStorageModeUI, saveStoredFirebaseConfig } from './firebase-config.js';
import { 
  subscribeToHospitals, 
  addHospital, 
  updateHospital, 
  deleteHospital, 
  seedSampleHospitals, 
  clearAllHospitals,
  calculateBedMetrics,
  updateOccupiedBedsOnly,
  subscribeToBookings,
  addPatientBooking,
  dischargePatient,
  confirmPatientBooking,
  cancelPatientBooking,
  getRoomsAndBedsForHospital,
  ROOM_TARIFFS
} from './hospitalService.js';
import { updateDashboard, getBadgeClass, escapeHtml, formatRelativeTime } from './dashboard.js';

// Application State
let allHospitals = [];
let allBookings = [];
let pendingDeleteId = null;
let pendingStepId = null;
let currentStepTotal = 0;
let currentStepOccupied = 0;

// Patient Detailed View Drawer State
let selectedBookingForDetail = null;

// Patient Discharge Modal State
let pendingDischargeBooking = null;

// Temporary holder for booking payload during confirmation step
let pendingBookingPayload = null;

// Notification Logs State
let notificationLogs = [];

// Init Application
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupAuthListeners();
  setupFormListeners();
  setupSearchAndFilters();
  setupModals();
  setupMobileDrawer();
  setupCollapsibleSidebar();
  setupHeaderInteractions();
  setupRememberMe();
  setupPatientDetailsDrawer();
  updateStorageModeUI();

  // Setup New Patient Cost Preview Handlers
  setupBookingFormCalculator();

  // Subscribe to real-time Firestore hospital data
  subscribeToHospitals((hospitals) => {
    allHospitals = hospitals;
    populateHospitalDropdowns();
    renderAllViews();
    updateNotificationFeed();
  });

  // Subscribe to real-time Patient Bookings data
  subscribeToBookings((bookings) => {
    // Generate notification alerts for newly added bookings or discharges
    processNewNotifications(bookings);
    
    allBookings = bookings;
    renderAllViews();
    updateNotificationFeed();
  });
});

// ================= Navigation Router =================
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = link.getAttribute('data-section');
      if (targetSection) {
        switchSection(targetSection);
        closeMobileSidebar();
      }
    });
  });

  // Handle URL hash changes
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      switchSection(hash);
    }
  });

  // Initial Hash check - if no hash, show landing page
  const initialHash = window.location.hash.replace('#', '') || 'landing';
  switchSection(initialHash);
}

function switchSection(sectionId) {
  const isAuth = isAuthenticated();
  const role = getCurrentUserRole();

  // Public-only sections (redirect if auth)
  const publicSections = ['landing', 'admin-login', 'user-login', 'register'];

  // Admin-only sections
  const adminOnlySections = ['dashboard', 'add-hospital', 'reports'];
  // Admin + Staff sections  
  const adminStaffSections = ['patient-admissions'];
  // User-only sections
  const userSections = ['user-dashboard', 'user-available-beds', 'user-my-bookings'];
  // Shared protected sections (accessible by Admin, Staff, and Patients)
  const sharedProtectedSections = ['book-bed'];

  // Redirect unauthenticated users from protected sections
  if (!isAuth) {
    if (adminOnlySections.includes(sectionId) || adminStaffSections.includes(sectionId)) {
      showToast('Please sign in to access this area.', 'info');
      switchSection('admin-login');
      return;
    }
    if (userSections.includes(sectionId) || sharedProtectedSections.includes(sectionId)) {
      showToast('Please sign in to access your portal.', 'info');
      switchSection('user-login');
      return;
    }
  }

  // Role-based redirects for authenticated users
  if (isAuth) {
    if (role === 'USER' && (adminOnlySections.includes(sectionId) || adminStaffSections.includes(sectionId))) {
      showToast('Access denied. Redirecting to patient portal.', 'error');
      switchSection('user-dashboard');
      return;
    }
    if ((role === 'ADMIN' || role === 'STAFF') && userSections.includes(sectionId)) {
      showToast('Staff use admin portal. Redirecting to dashboard.', 'info');
      switchSection('dashboard');
      return;
    }
    // Redirect authenticated users away from login/register to their dashboards
    if (publicSections.includes(sectionId) && sectionId !== 'landing') {
      switchSection(role === 'USER' ? 'user-dashboard' : 'dashboard');
      return;
    }
  }

  // Toggle app layout sidebar based on section type
  const appLayout = document.getElementById('app');
  const mainLayout = document.getElementById('mainLayout');
  const headerBar = document.getElementById('appHeader');
  const portalSections = ['landing', 'admin-login', 'user-login', 'register'];

  if (portalSections.includes(sectionId)) {
    if (appLayout) appLayout.classList.add('no-sidebar');
    if (headerBar) headerBar.style.display = 'none';
  } else {
    if (appLayout) appLayout.classList.remove('no-sidebar');
    if (headerBar) headerBar.style.display = '';
  }

  const sections = document.querySelectorAll('.content-section');
  sections.forEach(sec => sec.classList.remove('active'));

  const targetSec = document.getElementById(`section-${sectionId}`);
  if (targetSec) {
    targetSec.classList.add('active');
  }

  // Update Nav Active Links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(l => {
    if (l.getAttribute('data-section') === sectionId) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });

  // Update Header Titles
  const pageTitle = document.getElementById('pageTitle');
  const pageSubTitle = document.getElementById('pageSubTitle');

  switch (sectionId) {
    case 'dashboard':
      if (pageTitle) pageTitle.textContent = 'Dashboard Overview';
      if (pageSubTitle) pageSubTitle.textContent = 'Real-time hospital bed allocation across departments';
      break;
    case 'hospitals':
      if (pageTitle) pageTitle.textContent = 'Hospital Bed Inventory';
      if (pageSubTitle) pageSubTitle.textContent = 'Filter, search and manage facility capacities';
      break;
    case 'rooms-beds':
      if (pageTitle) pageTitle.textContent = 'Rooms & Beds Layout';
      if (pageSubTitle) pageSubTitle.textContent = 'Interactive visual layout of hospital departments';
      break;
    case 'patient-admissions':
      if (pageTitle) pageTitle.textContent = 'Patient Admissions Registry';
      if (pageSubTitle) pageSubTitle.textContent = 'Monitor current patients, invoices, and stay timelines';
      renderAdminBookingsTable();
      break;
    case 'book-bed':
      if (pageTitle) pageTitle.textContent = 'Patient Bed Booking';
      if (pageSubTitle) pageSubTitle.textContent = 'Register a new patient admission and calculate tariff costs';
      break;
    case 'reports':
      if (pageTitle) pageTitle.textContent = 'Financial & Admission Reports';
      if (pageSubTitle) pageSubTitle.textContent = 'Summary of cashflow yields and department distribution';
      break;
    case 'add-hospital':
      if (pageTitle) pageTitle.textContent = 'Add Hospital Record';
      if (pageSubTitle) pageSubTitle.textContent = 'Create a new medical facility entry in Firestore';
      break;
    case 'about':
      if (pageTitle) pageTitle.textContent = 'System & Architecture';
      if (pageSubTitle) pageSubTitle.textContent = 'Cloud application structure, rules and configuration';
      break;
    case 'user-dashboard':
      if (pageTitle) pageTitle.textContent = 'Patient Portal';
      if (pageSubTitle) pageSubTitle.textContent = 'Find hospitals and check bed availability near you';
      renderUserHospitalGrid();
      break;
    case 'user-available-beds':
      if (pageTitle) pageTitle.textContent = 'Available Beds';
      if (pageSubTitle) pageSubTitle.textContent = 'Browse available beds and submit a booking request';
      renderUserAvailableBeds();
      break;
    case 'user-my-bookings':
      if (pageTitle) pageTitle.textContent = 'My Bookings';
      if (pageSubTitle) pageSubTitle.textContent = 'View status of your bed booking requests';
      renderUserMyBookings();
      break;
  }

  window.location.hash = `#${sectionId}`;
}

// ================= Render Views =================
function renderAllViews() {
  const role = getCurrentUserRole();
  updateDashboard(allHospitals, allBookings);
  renderHospitalsTable();
  renderRoomsBedsPage();
  if (role === 'ADMIN' || role === 'STAFF') {
    renderPatientAdmissionsTable();
    renderAdminBookingsTable();
  } else if (role === 'USER') {
    renderUserHospitalGrid();
    renderUserAvailableBeds();
    renderUserMyBookings();
  }
}

function populateHospitalDropdowns() {
  const roomHospFilter = document.getElementById('roomHospitalFilter');
  const bookHospSelect = document.getElementById('bookHospital');
  const userHospSelect = document.getElementById('userHospSelect');
  const userLocFilter = document.getElementById('userLocationFilter');

  if (roomHospFilter) {
    const prevVal = roomHospFilter.value;
    roomHospFilter.innerHTML = allHospitals.map(h => 
      `<option value="${h.id}">${escapeHtml(h.hospitalName)} (${escapeHtml(h.department)})</option>`
    ).join('');
    if (prevVal && allHospitals.some(h => h.id === prevVal)) {
      roomHospFilter.value = prevVal;
    }
  }

  if (bookHospSelect) {
    const prevVal = bookHospSelect.value;
    bookHospSelect.innerHTML = '<option value="">Select Hospital...</option>' + 
      allHospitals.map(h => `<option value="${h.id}">${escapeHtml(h.hospitalName)} (${escapeHtml(h.department)})</option>`).join('');
    if (prevVal && allHospitals.some(h => h.id === prevVal)) {
      bookHospSelect.value = prevVal;
    }
  }

  if (userHospSelect) {
    const prevVal = userHospSelect.value;
    userHospSelect.innerHTML = '<option value="">Select a Hospital...</option>' +
      allHospitals.map(h => `<option value="${h.id}">${escapeHtml(h.hospitalName)} – ${escapeHtml(h.department)}</option>`).join('');
    if (prevVal && allHospitals.some(h => h.id === prevVal)) {
      userHospSelect.value = prevVal;
    }
  }

  if (userLocFilter) {
    const prevVal = userLocFilter.value;
    const locations = [...new Set(allHospitals.map(h => h.location).filter(Boolean))];
    userLocFilter.innerHTML = '<option value="All">All Locations</option>' +
      locations.map(loc => `<option value="${loc}">${escapeHtml(loc)}</option>`).join('');
    if (prevVal && locations.includes(prevVal)) {
      userLocFilter.value = prevVal;
    }
  }
}

function renderHospitalsTable() {
  const tbody = document.getElementById('hospitalsTableBody');
  const recordCountBadge = document.getElementById('recordCountBadge');
  const emptyState = document.getElementById('emptyState');
  if (!tbody) return;

  const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const filterDept = document.getElementById('departmentFilter')?.value || 'All';
  const filterStatus = document.getElementById('statusFilter')?.value || 'All';
  const sortOption = document.getElementById('sortFilter')?.value || 'hospitalName|asc';

  let filtered = allHospitals.filter(h => {
    const matchesSearch = !searchVal || 
      (h.hospitalName && h.hospitalName.toLowerCase().includes(searchVal)) ||
      (h.location && h.location.toLowerCase().includes(searchVal));
    const matchesDept = filterDept === 'All' || h.department === filterDept;
    const matchesStatus = filterStatus === 'All' || h.status === filterStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  // Sort Array
  const [sortKey, sortOrder] = sortOption.split('|');
  filtered.sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    } else {
      valA = parseInt(valA, 10) || 0;
      valB = parseInt(valB, 10) || 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  if (recordCountBadge) {
    recordCountBadge.textContent = `Showing ${filtered.length} of ${allHospitals.length} Hospitals`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  } else {
    if (emptyState) emptyState.classList.add('hidden');
  }

  const isAuth = isAuthenticated();

  tbody.innerHTML = filtered.map(h => {
    const badgeClass = getBadgeClass(h.status);
    const updatedTime = formatRelativeTime(h.updatedAt);

    return `
      <tr data-id="${h.id}" class="align-middle">
        <td data-label="Hospital"><strong>${escapeHtml(h.hospitalName)}</strong></td>
        <td data-label="Location">${escapeHtml(h.location)}</td>
        <td data-label="Department"><span class="badge badge-subtle">${escapeHtml(h.department)}</span></td>
        <td data-label="Total Beds">${h.totalBeds}</td>
        <td data-label="Occupied">
          <div class="d-flex items-center gap-1">
            <span>${h.occupiedBeds}</span>
            ${isAuth ? `<button class="action-icon-btn btn-xs quick-step-btn" data-id="${h.id}" data-name="${escapeHtml(h.hospitalName)}" data-total="${h.totalBeds}" data-occupied="${h.occupiedBeds}" title="Quick Update Occupied Beds">&#9998;</button>` : ''}
          </div>
        </td>
        <td data-label="Available"><strong class="text-emerald" style="color: var(--accent-emerald);">${h.availableBeds}</strong></td>
        <td data-label="Status"><span class="badge ${badgeClass}">${h.status}</span></td>
        <td data-label="Last Updated" class="text-muted text-sm">${updatedTime}</td>
        <td data-label="Actions" class="text-right">
          ${isAuth ? `
            <button class="action-icon-btn edit edit-btn" data-id="${h.id}" title="Edit Record">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="action-icon-btn delete delete-btn" data-id="${h.id}" data-name="${escapeHtml(h.hospitalName)}" title="Delete Record">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          ` : `
            <span class="text-muted text-xs">Read Only</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  attachTableEventHandlers();
}

function attachTableEventHandlers() {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const record = allHospitals.find(item => item.id === id);
      if (record) populateFormForEdit(record);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      openDeleteModal(id, name);
    });
  });

  document.querySelectorAll('.quick-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const total = parseInt(btn.getAttribute('data-total'), 10);
      const occupied = parseInt(btn.getAttribute('data-occupied'), 10);
      openStepBedsModal(id, name, total, occupied);
    });
  });
}

// ================= Rooms & Beds Visual Layout Redesign =================
function renderRoomsBedsPage() {
  const container = document.getElementById('roomsVisualContainer');
  const roomHospFilter = document.getElementById('roomHospitalFilter');
  const roomTypeFilter = document.getElementById('roomTypeFilter');
  const bedStatusFilter = document.getElementById('bedStatusFilter');
  if (!container || !roomHospFilter) return;

  const selectedHospId = roomHospFilter.value;
  const selectedRoomType = roomTypeFilter ? roomTypeFilter.value : 'All';
  const selectedBedStatus = bedStatusFilter ? bedStatusFilter.value : 'All';

  if (!selectedHospId) {
    container.innerHTML = `<div class="text-center text-muted col-span-2 py-4">Please seed or select a hospital facility to view room layout.</div>`;
    return;
  }

  const hospital = allHospitals.find(h => h.id === selectedHospId);
  if (!hospital) {
    container.innerHTML = `<div class="text-center text-muted col-span-2 py-4">Facility not found.</div>`;
    return;
  }

  // Get Room lists deterministically from service
  const roomsList = getRoomsAndBedsForHospital(hospital, allBookings);

  // Group Rooms by Room Type / Category
  const groupedRooms = {};
  roomsList.forEach(r => {
    if (selectedRoomType !== 'All' && r.roomType !== selectedRoomType) return;
    
    // Apply bed status filtering inside the room beds
    const filteredBeds = r.beds.filter(b => selectedBedStatus === 'All' || b.status === selectedBedStatus);
    if (selectedBedStatus !== 'All' && filteredBeds.length === 0) return;

    if (!groupedRooms[r.roomType]) {
      groupedRooms[r.roomType] = [];
    }
    
    groupedRooms[r.roomType].push({
      ...r,
      beds: filteredBeds
    });
  });

  const groupKeys = Object.keys(groupedRooms);
  if (groupKeys.length === 0) {
    container.innerHTML = `<div class="text-center text-muted col-span-2 py-4">No rooms match the selected criteria.</div>`;
    return;
  }

  container.innerHTML = groupKeys.map(category => {
    const roomsHtml = groupedRooms[category].map(r => {
      const bedsHtml = r.beds.map(b => {
        const isOcc = b.status === 'Occupied';
        const statusClass = isOcc ? 'occupied' : 'available';
        const buttonText = isOcc ? 'Occupied' : 'Book Bed';

        return `
          <div class="bed-card-slot ${statusClass}">
            <div class="bed-slot-info">
              <span class="bed-slot-name">Bed ${b.bedNumber}</span>
              <span class="bed-slot-type">${escapeHtml(r.roomType)}</span>
            </div>
            <button class="bed-slot-action-btn ${statusClass}"
                    data-room="${r.roomNumber}" 
                    data-bed="${b.bedNumber}" 
                    data-type="${r.roomType}"
                    data-hosp-id="${hospital.id}"
                    data-hosp-name="${escapeHtml(hospital.hospitalName)}"
                    data-dept="${escapeHtml(hospital.department)}"
                    data-status="${b.status}"
                    data-booking-id="${b.bookingId || ''}">
              ${buttonText}
            </button>
          </div>
        `;
      }).join('');

      return `
        <div class="room-card">
          <div class="room-card-header">
            <div>
              <span class="room-card-title">Room ${r.roomNumber}</span>
              <span class="room-meta">${escapeHtml(hospital.hospitalName)}</span>
            </div>
            <span class="room-card-price">₹${r.costPerDay.toLocaleString()}/day</span>
          </div>
          <div class="beds-container">
            ${bedsHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="room-type-group">
        <div class="room-type-group-header">
          <h3>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span>${escapeHtml(category)} Category</span>
          </h3>
          <span class="badge badge-subtle">${groupedRooms[category].length} Rooms</span>
        </div>
        <div class="room-cards-container">
          ${roomsHtml}
        </div>
      </div>
    `;
  }).join('');

  // Attach bed slot button event handlers
  document.querySelectorAll('.bed-slot-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.getAttribute('data-status');
      const hospId = btn.getAttribute('data-hosp-id');
      const hospName = btn.getAttribute('data-hosp-name');
      const dept = btn.getAttribute('data-dept');
      const roomNum = btn.getAttribute('data-room');
      const bedNum = btn.getAttribute('data-bed');
      const roomType = btn.getAttribute('data-type');
      const bookingId = btn.getAttribute('data-booking-id');

      if (status === 'Available') {
        if (!isAuthenticated()) {
          showToast('Admin login required to book patient beds.', 'info');
          openAuthModal();
        } else {
          prepopulateBookingForm(hospId, dept, roomType, roomNum, bedNum);
          switchSection('book-bed');
        }
      } else {
        if (isAuthenticated() && bookingId) {
          const booking = allBookings.find(b => b.id === bookingId);
          if (booking) {
            openPatientDetailsDrawer(booking);
          }
        } else {
          showToast(`Bed ${bedNum} is currently occupied by a patient.`, 'info');
        }
      }
    });
  });
}

// Prepopulate booking fields
function prepopulateBookingForm(hospId, dept, roomType, roomNumber, bedNumber) {
  const bookHosp = document.getElementById('bookHospital');
  const bookDept = document.getElementById('bookDepartment');
  const bookRoomType = document.getElementById('bookRoomType');
  const bookRoomNumber = document.getElementById('bookRoomNumber');

  if (bookHosp) bookHosp.value = hospId;
  triggerBookingCascadeOptions(hospId, dept, roomType, roomNumber, bedNumber);
}

// ================= Patient Admissions Registry =================
function renderPatientAdmissionsTable() {
  const tbody = document.getElementById('admissionsTableBody');
  if (!tbody) return;

  const searchVal = (document.getElementById('patientSearchInput')?.value || '').toLowerCase().trim();
  const filterStatus = document.getElementById('bookingStatusFilter')?.value || 'All';

  const filtered = allBookings.filter(b => {
    const matchesSearch = !searchVal || 
      (b.patientName && b.patientName.toLowerCase().includes(searchVal)) ||
      (b.patientId && b.patientId.toLowerCase().includes(searchVal));
    const matchesStatus = filterStatus === 'All' || b.bookingStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No patient admissions match filter criteria.</td></tr>`;
    return;
  }

  const isAuth = isAuthenticated();

  tbody.innerHTML = filtered.map(b => {
    const statusColors = {
      'Admitted': 'badge-available',
      'Pending': 'badge-warning',
      'Discharged': 'badge-subtle',
      'Cancelled': 'badge-critical'
    };
    const statusClass = statusColors[b.bookingStatus] || 'badge-subtle';
    const isAdmitted = b.bookingStatus === 'Admitted';
    const dischargeText = isAdmitted ? `Exp: ${b.expectedDischargeDate}` : `Act: ${b.actualDischargeDate || b.expectedDischargeDate}`;
    
    return `
      <tr class="align-middle clickable-row" data-id="${b.id}" style="cursor: pointer;">
        <td data-label="Patient Details">
          <div style="display:flex; flex-direction:column;">
            <strong>${escapeHtml(b.patientName)}</strong>
            <span class="text-muted text-xs">ID: ${escapeHtml(b.patientId)} | Age: ${b.age} | ${escapeHtml(b.gender)}</span>
          </div>
        </td>
        <td data-label="Allocation">
          <div style="display:flex; flex-direction:column;">
            <strong>${escapeHtml(b.hospitalName)}</strong>
            <span class="text-muted text-xs">${escapeHtml(b.department)} | Room ${b.roomNumber} - Bed ${b.bedNumber}</span>
          </div>
        </td>
        <td data-label="Dates">
          <div style="display:flex; flex-direction:column; font-size:0.8rem;">
            <span>Adm: ${b.admissionDate}</span>
            <span class="text-muted font-semibold">${dischargeText}</span>
          </div>
        </td>
        <td data-label="Tariff Details">
          <div style="display:flex; flex-direction:column; font-size:0.8rem;">
            <span>₹${(b.costPerDay||0).toLocaleString()}/day (${b.numberOfDays} days)</span>
            <strong style="color:var(--primary);">Est: ₹${(b.estimatedCost||0).toLocaleString()}</strong>
          </div>
        </td>
        <td data-label="Status">
          <span class="badge ${statusClass}">${b.bookingStatus}</span>
        </td>
        <td data-label="Action" class="text-right" onclick="event.stopPropagation();">
          ${isAdmitted ? `
            <button class="btn btn-outline-danger btn-xs discharge-btn" data-id="${b.id}">Discharge</button>
          ` : `
            <span class="text-muted text-xs">Processed</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  // Row click opens detailed slide-out panel
  document.querySelectorAll('.clickable-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-id');
      const booking = allBookings.find(b => b.id === id);
      if (booking) {
        openPatientDetailsDrawer(booking);
      }
    });
  });

  // Attach Discharge button handler
  document.querySelectorAll('.discharge-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const booking = allBookings.find(b => b.id === id);
      if (booking) {
        openDischargeModal(booking);
      }
    });
  });
}

// ================= Booking Select Cascade Logic =================
function triggerBookingCascadeOptions(hospId, targetDept, targetRoomType, targetRoomNumber, targetBedNumber) {
  const bookDept = document.getElementById('bookDepartment');
  const bookRoomType = document.getElementById('bookRoomType');
  const bookRoomNumber = document.getElementById('bookRoomNumber');

  if (!hospId) {
    if (bookDept) bookDept.innerHTML = '<option value="">Select Department...</option>';
    if (bookRoomNumber) bookRoomNumber.innerHTML = '<option value="">Select Bed Slot...</option>';
    return;
  }

  const hospital = allHospitals.find(h => h.id === hospId);
  if (hospital) {
    if (bookDept) {
      bookDept.innerHTML = `<option value="${hospital.department}">${escapeHtml(hospital.department)}</option>`;
      bookDept.value = hospital.department;
    }

    if (targetRoomType && bookRoomType) {
      bookRoomType.value = targetRoomType;
    }

    populateBedsSelector(hospital, bookRoomType.value, targetRoomNumber, targetBedNumber);
  }
}

function populateBedsSelector(hospital, roomType, targetRoom, targetBed) {
  const bookRoomNumber = document.getElementById('bookRoomNumber');
  if (!bookRoomNumber) return;

  if (!roomType) {
    bookRoomNumber.innerHTML = '<option value="">Select Bed Slot...</option>';
    return;
  }

  const rooms = getRoomsAndBedsForHospital(hospital, allBookings);
  const matchingRooms = rooms.filter(r => r.roomType === roomType);

  let optionsHtml = '<option value="">Select Bed Slot...</option>';
  matchingRooms.forEach(r => {
    r.beds.forEach(b => {
      const isCurrentTarget = targetRoom && targetRoom.toString() === r.roomNumber.toString() && targetBed === b.bedNumber;
      if (b.status === 'Available' || isCurrentTarget) {
        optionsHtml += `<option value="${r.roomNumber}|${b.bedNumber}" ${isCurrentTarget ? 'selected' : ''}>Room ${r.roomNumber} - Bed ${b.bedNumber}</option>`;
      }
    });
  });

  bookRoomNumber.innerHTML = optionsHtml;
}

// ================= Setup Booking Live Calculator =================
function setupBookingFormCalculator() {
  const bookHosp = document.getElementById('bookHospital');
  const bookRoomType = document.getElementById('bookRoomType');
  const bookRoomNumber = document.getElementById('bookRoomNumber');
  const admissionDateInput = document.getElementById('admissionDate');
  const expectedDischargeDateInput = document.getElementById('expectedDischargeDate');

  // Set default dates
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (admissionDateInput && !admissionDateInput.value) {
    admissionDateInput.value = today.toISOString().split('T')[0];
  }
  if (expectedDischargeDateInput && !expectedDischargeDateInput.value) {
    expectedDischargeDateInput.value = tomorrow.toISOString().split('T')[0];
  }

  const recalculateBookingCost = () => {
    const selectedType = bookRoomType ? bookRoomType.value : '';
    const admStr = admissionDateInput ? admissionDateInput.value : '';
    const disStr = expectedDischargeDateInput ? expectedDischargeDateInput.value : '';

    const costPerDay = ROOM_TARIFFS[selectedType] || 0;
    
    document.getElementById('bookingCostPerDay').textContent = `₹${costPerDay.toLocaleString()}`;

    if (admStr && disStr) {
      const adm = new Date(admStr);
      const dis = new Date(disStr);
      if (dis >= adm) {
        const diffTime = Math.abs(dis - adm);
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const total = diffDays * costPerDay;

        document.getElementById('bookingDuration').textContent = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
        document.getElementById('bookingEstimatedTotal').textContent = `₹${total.toLocaleString()}`;
        return;
      }
    }
    document.getElementById('bookingDuration').textContent = `0 Days`;
    document.getElementById('bookingEstimatedTotal').textContent = `₹0`;
  };

  if (bookHosp) {
    bookHosp.addEventListener('change', () => {
      triggerBookingCascadeOptions(bookHosp.value);
      recalculateBookingCost();
    });
  }

  if (bookRoomType) {
    bookRoomType.addEventListener('change', () => {
      const hospital = allHospitals.find(h => h.id === bookHosp.value);
      if (hospital) {
        populateBedsSelector(hospital, bookRoomType.value);
      }
      recalculateBookingCost();
    });
  }

  if (admissionDateInput) admissionDateInput.addEventListener('change', recalculateBookingCost);
  if (expectedDischargeDateInput) expectedDischargeDateInput.addEventListener('change', recalculateBookingCost);
}

// ================= Search & Filters Registry =================
function setupSearchAndFilters() {
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const departmentFilter = document.getElementById('departmentFilter');
  const statusFilter = document.getElementById('statusFilter');
  const sortFilter = document.getElementById('sortFilter');
  
  const addHospitalTopBtn = document.getElementById('addHospitalTopBtn');
  const seedDataBtn = document.getElementById('seedDataBtn');
  const seedDataEmptyBtn = document.getElementById('seedDataEmptyBtn');
  const quickSeedBtn = document.getElementById('quickSeedBtn');
  const clearDataBtn = document.getElementById('clearDataBtn');

  // Search & Filters for patient bookings
  const patientSearch = document.getElementById('patientSearchInput');
  const clearPatientBtn = document.getElementById('clearPatientSearchBtn');
  const bookingStatusFilter = document.getElementById('bookingStatusFilter');

  // Rooms & Beds controls
  const roomHospFilter = document.getElementById('roomHospitalFilter');
  const roomTypeFilter = document.getElementById('roomTypeFilter');
  const bedStatusFilter = document.getElementById('bedStatusFilter');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (clearSearchBtn) {
        if (searchInput.value.length > 0) clearSearchBtn.classList.remove('hidden');
        else clearSearchBtn.classList.add('hidden');
      }
      renderHospitalsTable();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.classList.add('hidden');
      renderHospitalsTable();
    });
  }

  if (departmentFilter) departmentFilter.addEventListener('change', renderHospitalsTable);
  if (statusFilter) statusFilter.addEventListener('change', renderHospitalsTable);
  if (sortFilter) sortFilter.addEventListener('change', renderHospitalsTable);

  // Patients admissions filters
  if (patientSearch) {
    patientSearch.addEventListener('input', () => {
      if (clearPatientBtn) {
        if (patientSearch.value.length > 0) clearPatientBtn.classList.remove('hidden');
        else clearPatientBtn.classList.add('hidden');
      }
      renderPatientAdmissionsTable();
    });
  }

  if (clearPatientBtn) {
    clearPatientBtn.addEventListener('click', () => {
      patientSearch.value = '';
      clearPatientBtn.classList.add('hidden');
      renderPatientAdmissionsTable();
    });
  }

  if (bookingStatusFilter) {
    bookingStatusFilter.addEventListener('change', () => {
      renderPatientAdmissionsTable();
    });
  }

  // Rooms & Beds page layout filters
  if (roomHospFilter) roomHospFilter.addEventListener('change', renderRoomsBedsPage);
  if (roomTypeFilter) roomTypeFilter.addEventListener('change', renderRoomsBedsPage);
  if (bedStatusFilter) bedStatusFilter.addEventListener('change', renderRoomsBedsPage);

  // User/Patient dashboard filters
  const userSearch = document.getElementById('userSearchInput');
  const userLoc = document.getElementById('userLocationFilter');
  const userDept = document.getElementById('userDepartmentFilter');
  const userHospSelect = document.getElementById('userHospSelect');
  const userBedRoomTypeFilter = document.getElementById('userBedRoomTypeFilter');

  if (userSearch) userSearch.addEventListener('input', renderUserHospitalGrid);
  if (userLoc) userLoc.addEventListener('change', renderUserHospitalGrid);
  if (userDept) userDept.addEventListener('change', renderUserHospitalGrid);
  if (userHospSelect) userHospSelect.addEventListener('change', renderUserAvailableBeds);
  if (userBedRoomTypeFilter) userBedRoomTypeFilter.addEventListener('change', renderUserAvailableBeds);

  if (addHospitalTopBtn) {
    addHospitalTopBtn.addEventListener('click', () => {
      resetForm();
      switchSection('add-hospital');
    });
  }

  const seedHandler = async () => {
    showToast('Seeding sample hospital records...', 'info');
    const res = await seedSampleHospitals();
    if (res.success) {
      showToast(`Successfully seeded ${res.count} sample hospitals!`, 'success');
    }
  };

  if (seedDataBtn) seedDataBtn.addEventListener('click', seedHandler);
  if (seedDataEmptyBtn) seedDataEmptyBtn.addEventListener('click', seedHandler);
  if (quickSeedBtn) quickSeedBtn.addEventListener('click', seedHandler);

  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all hospital & patient data from Firestore?')) {
        await clearAllHospitals();
        showToast('All database records cleared.', 'info');
      }
    });
  }
}

// ================= Form & Validation Handlers =================
function setupFormListeners() {
  const form = document.getElementById('hospitalForm');
  const totalBedsInput = document.getElementById('totalBeds');
  const occupiedBedsInput = document.getElementById('occupiedBeds');
  const cancelFormBtn = document.getElementById('cancelFormBtn');

  // Booking Form elements
  const bookingForm = document.getElementById('bookingForm');
  const cancelBookingBtn = document.getElementById('cancelBookingBtn');

  const updatePreview = () => {
    const total = parseInt(totalBedsInput.value, 10) || 0;
    const occupied = parseInt(occupiedBedsInput.value, 10) || 0;
    const metrics = calculateBedMetrics(total, occupied);

    const prevAvail = document.getElementById('previewAvailableBeds');
    const prevPct = document.getElementById('previewPercentage');
    const prevBadge = document.getElementById('previewStatusBadge');

    if (prevAvail) prevAvail.textContent = metrics.availableBeds;
    if (prevPct) prevPct.textContent = `${metrics.availabilityPercentage}%`;
    if (prevBadge) {
      prevBadge.textContent = metrics.status;
      prevBadge.className = `badge ${getBadgeClass(metrics.status)}`;
    }
  };

  if (totalBedsInput) totalBedsInput.addEventListener('input', updatePreview);
  if (occupiedBedsInput) occupiedBedsInput.addEventListener('input', updatePreview);

  if (cancelFormBtn) {
    cancelFormBtn.addEventListener('click', () => {
      resetForm();
      switchSection('hospitals');
    });
  }

  // Submit Handler for Hospital record
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormErrors();

      const id = document.getElementById('hospitalId').value;
      const formData = {
        hospitalName: document.getElementById('hospitalName').value,
        location: document.getElementById('location').value,
        department: document.getElementById('department').value,
        totalBeds: document.getElementById('totalBeds').value,
        occupiedBeds: document.getElementById('occupiedBeds').value
      };

      const saveBtn = document.getElementById('saveHospitalBtn');
      if (saveBtn) saveBtn.disabled = true;

      let result;
      if (id) {
        result = await updateHospital(id, formData);
      } else {
        result = await addHospital(formData);
      }

      if (saveBtn) saveBtn.disabled = false;

      if (result.success) {
        showToast(id ? 'Hospital record updated successfully!' : 'New hospital added successfully!', 'success');
        resetForm();
        switchSection('hospitals');
      } else if (result.errors) {
        displayFormErrors(result.errors);
      } else {
        showToast(result.message || 'Operation failed.', 'error');
      }
    });
  }

  // Cancel booking click
  if (cancelBookingBtn) {
    cancelBookingBtn.addEventListener('click', () => {
      if (bookingForm) bookingForm.reset();
      switchSection('rooms-beds');
    });
  }

  // Submit Handler for Bed Booking form (Redesigned with Confirmation step modal)
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearBookingFormErrors();

      const hospId = document.getElementById('bookHospital').value;
      const hospitalObj = allHospitals.find(h => h.id === hospId);

      const roomBedStr = document.getElementById('bookRoomNumber').value;
      let roomNumber = '';
      let bedNumber = '';
      if (roomBedStr) {
        const parts = roomBedStr.split('|');
        roomNumber = parts[0];
        bedNumber = parts[1];
      }

      const bookingPayload = {
        hospitalId: hospId,
        hospitalName: hospitalObj ? hospitalObj.hospitalName : '',
        department: document.getElementById('bookDepartment').value,
        roomType: document.getElementById('bookRoomType').value,
        roomNumber,
        bedNumber,
        patientName: document.getElementById('patientName').value,
        patientId: document.getElementById('patientId').value,
        patientAge: document.getElementById('patientAge').value,
        patientGender: document.getElementById('patientGender').value,
        patientPhone: document.getElementById('patientPhone').value,
        patientEmergencyContact: document.getElementById('patientEmergencyContact').value,
        admissionDate: document.getElementById('admissionDate').value,
        expectedDischargeDate: document.getElementById('expectedDischargeDate').value
      };

      // Perform validation check beforehand
      const tempErrors = {};
      if (!bookingPayload.patientName) tempErrors.patientName = 'Name is required';
      if (!bookingPayload.patientId) tempErrors.patientId = 'Patient ID is required';
      if (!bookingPayload.admissionDate) tempErrors.admissionDate = 'Admission date is required';
      if (!bookingPayload.expectedDischargeDate) tempErrors.expectedDischargeDate = 'Discharge date is required';
      if (bookingPayload.expectedDischargeDate && bookingPayload.admissionDate && new Date(bookingPayload.expectedDischargeDate) < new Date(bookingPayload.admissionDate)) {
        tempErrors.expectedDischargeDate = 'Expected discharge cannot be prior to admission';
      }

      if (Object.keys(tempErrors).length > 0) {
        displayBookingFormErrors(tempErrors);
        return;
      }

      // Open confirm modal instead of direct booking
      pendingBookingPayload = bookingPayload;
      openBookingConfirmModal(bookingPayload);
    });
  }
}

function openBookingConfirmModal(payload) {
  const modal = document.getElementById('confirmBookingModal');
  document.getElementById('cbPatientName').textContent = payload.patientName;
  document.getElementById('cbHospitalName').textContent = payload.hospitalName;
  document.getElementById('cbBedName').textContent = `Room ${payload.roomNumber} - Bed ${payload.bedNumber}`;
  
  const dailyRate = ROOM_TARIFFS[payload.roomType] || 0;
  const days = Math.max(1, Math.ceil(Math.abs(new Date(payload.expectedDischargeDate) - new Date(payload.admissionDate)) / (1000 * 60 * 60 * 24)));
  document.getElementById('cbTotalCost').textContent = `₹${(days * dailyRate).toLocaleString()}`;

  if (modal) modal.classList.remove('hidden');
}

function closeBookingConfirmModal() {
  const modal = document.getElementById('confirmBookingModal');
  if (modal) modal.classList.add('hidden');
  pendingBookingPayload = null;
}

function populateFormForEdit(record) {
  document.getElementById('hospitalId').value = record.id;
  document.getElementById('hospitalName').value = record.hospitalName;
  document.getElementById('location').value = record.location;
  document.getElementById('department').value = record.department;
  document.getElementById('totalBeds').value = record.totalBeds;
  document.getElementById('occupiedBeds').value = record.occupiedBeds;

  document.getElementById('formTitle').textContent = 'Edit Hospital Facility';
  document.getElementById('formSubTitle').textContent = `Updating record ID: ${record.id}`;
  document.getElementById('saveBtnText').textContent = 'Update Hospital Record';

  switchSection('add-hospital');

  const totalBedsInput = document.getElementById('totalBeds');
  if (totalBedsInput) totalBedsInput.dispatchEvent(new Event('input'));
}

function resetForm() {
  document.getElementById('hospitalId').value = '';
  const form = document.getElementById('hospitalForm');
  if (form) form.reset();

  document.getElementById('formTitle').textContent = 'Add New Hospital Facility';
  document.getElementById('formSubTitle').textContent = 'Enter bed capacity and department parameters. Available beds will be calculated automatically.';
  document.getElementById('saveBtnText').textContent = 'Save Hospital Record';

  clearFormErrors();
  
  const totalBedsInput = document.getElementById('totalBeds');
  if (totalBedsInput) totalBedsInput.dispatchEvent(new Event('input'));
}

function displayFormErrors(errors) {
  for (const field in errors) {
    const inputEl = document.getElementById(field);
    const errEl = document.getElementById(`err-${field}`);
    if (inputEl) inputEl.classList.add('is-invalid');
    if (errEl) errEl.textContent = errors[field];
  }
}

function clearFormErrors() {
  document.querySelectorAll('.form-control, .form-select').forEach(el => el.classList.remove('is-invalid'));
  document.querySelectorAll('.error-feedback').forEach(el => el.textContent = '');
}

function displayBookingFormErrors(errors) {
  for (const field in errors) {
    const inputEl = document.getElementById(field);
    const errEl = document.getElementById(`err-${field}`);
    if (inputEl) inputEl.classList.add('is-invalid');
    if (errEl) errEl.textContent = errors[field];
  }
}

function clearBookingFormErrors() {
  document.querySelectorAll('#bookingForm .form-control, #bookingForm .form-select').forEach(el => el.classList.remove('is-invalid'));
  document.querySelectorAll('#bookingForm .error-feedback').forEach(el => el.textContent = '');
}

// ================= Auth Listener & Modal =================
function setupAuthListeners() {
  initAuth((user) => {
    const role = getCurrentUserRole();
    renderHospitalsTable();
    renderRoomsBedsPage();
    if (role === 'ADMIN' || role === 'STAFF') {
      renderPatientAdmissionsTable();
      renderAdminBookingsTable();
    } else if (role === 'USER') {
      renderUserHospitalGrid();
      renderUserAvailableBeds();
      renderUserMyBookings();
    }
  });

  const openLoginBtn = document.getElementById('openLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const authForm = document.getElementById('authForm');
  const fillDemoBtn = document.getElementById('fillDemoCredentialsBtn');

  if (openLoginBtn) openLoginBtn.addEventListener('click', openAuthModal);
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logoutUser();
      showToast('Logged out successfully.', 'info');
      switchSection('landing');
    });
  }

  if (fillDemoBtn) {
    fillDemoBtn.addEventListener('click', () => {
      document.getElementById('authEmail').value = 'admin@hospital.org';
      document.getElementById('authPassword').value = 'admin123';
    });
  }

  // --- Admin Portal Login Form ---
  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;
      const errAlert = document.getElementById('adminLoginError');
      const btn = adminLoginForm.querySelector('button[type="submit"]');

      if (errAlert) errAlert.classList.add('hidden');
      if (btn) btn.disabled = true;

      const res = await loginUser(email, password, 'ADMIN_STAFF');
      if (btn) btn.disabled = false;

      if (res.success) {
        showToast(`Welcome back, Admin!`, 'success');
        switchSection('dashboard');
      } else {
        if (errAlert) {
          errAlert.textContent = res.message || 'Invalid credentials or insufficient privileges.';
          errAlert.classList.remove('hidden');
        }
      }
    });
  }

  // --- User/Patient Portal Login Form ---
  const userLoginForm = document.getElementById('userLoginForm');
  if (userLoginForm) {
    userLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('userLoginEmail').value.trim();
      const password = document.getElementById('userLoginPassword').value;
      const errAlert = document.getElementById('userLoginError');
      const btn = userLoginForm.querySelector('button[type="submit"]');

      if (errAlert) errAlert.classList.add('hidden');
      if (btn) btn.disabled = true;

      const res = await loginUser(email, password, 'USER');
      if (btn) btn.disabled = false;

      if (res.success) {
        showToast(`Welcome to PulseBed Patient Portal!`, 'success');
        switchSection('user-dashboard');
      } else {
        if (errAlert) {
          errAlert.textContent = res.message || 'Invalid credentials.';
          errAlert.classList.remove('hidden');
        }
      }
    });
  }

  // Demo fill for patient portal
  const fillPatientDemoBtn = document.getElementById('fillPatientDemoBtn');
  if (fillPatientDemoBtn) {
    fillPatientDemoBtn.addEventListener('click', () => {
      const emailEl = document.getElementById('userLoginEmail');
      const pwdEl = document.getElementById('userLoginPassword');
      if (emailEl) emailEl.value = 'patient@example.com';
      if (pwdEl) pwdEl.value = 'patient123';
    });
  }
  // Demo fill for admin portal
  const fillAdminDemoBtn = document.getElementById('fillAdminDemoBtn');
  if (fillAdminDemoBtn) {
    fillAdminDemoBtn.addEventListener('click', () => {
      const emailEl = document.getElementById('adminEmail');
      const pwdEl = document.getElementById('adminPassword');
      if (emailEl) emailEl.value = 'admin@hospital.org';
      if (pwdEl) pwdEl.value = 'admin123';
    });
  }

  // --- Registration Form ---
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value;
      const confirmPassword = document.getElementById('regConfirmPassword').value;
      const errAlert = document.getElementById('registerError');
      const btn = registerForm.querySelector('button[type="submit"]');

      if (errAlert) errAlert.classList.add('hidden');

      if (!name || !email || !phone || !password) {
        if (errAlert) { errAlert.textContent = 'All fields are required.'; errAlert.classList.remove('hidden'); }
        return;
      }
      if (password !== confirmPassword) {
        if (errAlert) { errAlert.textContent = 'Passwords do not match.'; errAlert.classList.remove('hidden'); }
        return;
      }
      if (password.length < 6) {
        if (errAlert) { errAlert.textContent = 'Password must be at least 6 characters.'; errAlert.classList.remove('hidden'); }
        return;
      }

      if (btn) btn.disabled = true;
      const res = await registerUser(name, email, phone, password);
      if (btn) btn.disabled = false;

      if (res.success) {
        showToast('Account created! Welcome to PulseBed.', 'success');
        switchSection('user-dashboard');
      } else {
        if (errAlert) {
          errAlert.textContent = res.message || 'Registration failed. Please try again.';
          errAlert.classList.remove('hidden');
        }
      }
    });
  }

  // --- Landing card navigation ---
  document.getElementById('goToAdminLoginBtn')?.addEventListener('click', () => switchSection('admin-login'));
  document.getElementById('goToUserLoginBtn')?.addEventListener('click', () => switchSection('user-login'));
  document.getElementById('goToRegisterFromUser')?.addEventListener('click', () => switchSection('register'));
  document.getElementById('goToUserLoginFromRegister')?.addEventListener('click', () => switchSection('user-login'));
  document.getElementById('goToAdminFromLanding')?.addEventListener('click', () => switchSection('admin-login'));
  document.getElementById('backToLandingFromAdmin')?.addEventListener('click', () => switchSection('landing'));
  document.getElementById('backToLandingFromUser')?.addEventListener('click', () => switchSection('landing'));
  document.getElementById('backToLandingFromRegister')?.addEventListener('click', () => switchSection('landing'));
  
  document.getElementById('landingConfigLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection('about');
  });
}

function openAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('hidden');
}

// ================= Remember Me Setup =================
function setupRememberMe() {
  const rememberedEmail = localStorage.getItem('remembered_admin_email');
  if (rememberedEmail) {
    const emailField = document.getElementById('authEmail');
    const rememberCheckbox = document.getElementById('rememberMe');
    if (emailField) emailField.value = rememberedEmail;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }
}

// ================= Modals Handling =================
function setupModals() {
  document.getElementById('closeAuthModalBtn')?.addEventListener('click', closeAuthModal);

  // Delete Modal
  const deleteModal = document.getElementById('deleteModal');
  document.getElementById('closeDeleteModalBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);

  document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
    if (pendingDeleteId) {
      await deleteHospital(pendingDeleteId);
      showToast('Hospital record deleted successfully.', 'success');
      closeDeleteModal();
    }
  });

  // Config Modal is now inline in section-about

  document.getElementById('configForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const apiKey = document.getElementById('cfgApiKey').value.trim();
    const projectId = document.getElementById('cfgProjectId').value.trim();
    const authDomain = document.getElementById('cfgAuthDomain').value.trim();

    if (apiKey && projectId) {
      saveStoredFirebaseConfig({ apiKey, projectId, authDomain });
      showToast('Firebase Config saved! Reloading application...', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      showToast('Please enter both API Key and Project ID.', 'error');
    }
  });

  // Booking Confirmation Modal
  document.getElementById('closeConfirmBookingModalBtn')?.addEventListener('click', closeBookingConfirmModal);
  document.getElementById('finalBookingCancelBtn')?.addEventListener('click', closeBookingConfirmModal);
  
  document.getElementById('finalBookingConfirmBtn')?.addEventListener('click', async () => {
    if (pendingBookingPayload) {
      const bookBtn = document.getElementById('bookSubmitBtn');
      if (bookBtn) bookBtn.disabled = true;

      const res = await addPatientBooking(pendingBookingPayload);
      if (bookBtn) bookBtn.disabled = false;

      if (res.success) {
        showToast(`Patient Bed Admission Booked successfully!`, 'success');
        document.getElementById('bookingForm').reset();
        closeBookingConfirmModal();
        switchSection('patient-admissions');
      } else {
        showToast(res.message || 'Booking operation failed.', 'error');
        closeBookingConfirmModal();
      }
    }
  });

  setupStepBedsModal();
  setupDischargeModalListeners();
}

function openDeleteModal(id, name) {
  pendingDeleteId = id;
  const nameEl = document.getElementById('deleteHospitalName');
  if (nameEl) nameEl.textContent = name;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.classList.remove('hidden');
}

// Eye toggler on Password inputs (Admin Login)
const toggleAdminPasswordBtn = document.getElementById('toggleAdminPasswordBtn');
if (toggleAdminPasswordBtn) {
  toggleAdminPasswordBtn.addEventListener('click', () => {
    const pwdInput = document.getElementById('adminPassword');
    const eyeOpen = document.getElementById('eyeOpenIconAdmin');
    const eyeClosed = document.getElementById('eyeClosedIconAdmin');
    if (pwdInput && pwdInput.type === 'password') {
      pwdInput.type = 'text';
      eyeOpen?.classList.add('hidden');
      eyeClosed?.classList.remove('hidden');
    } else if (pwdInput) {
      pwdInput.type = 'password';
      eyeOpen?.classList.remove('hidden');
      eyeClosed?.classList.add('hidden');
    }
  });
}

// Eye toggler on Password inputs (User Login)
const toggleUserPasswordBtn = document.getElementById('toggleUserPasswordBtn');
if (toggleUserPasswordBtn) {
  toggleUserPasswordBtn.addEventListener('click', () => {
    const pwdInput = document.getElementById('userLoginPassword');
    const eyeOpen = document.getElementById('eyeOpenIconUser');
    const eyeClosed = document.getElementById('eyeClosedIconUser');
    if (pwdInput && pwdInput.type === 'password') {
      pwdInput.type = 'text';
      eyeOpen?.classList.add('hidden');
      eyeClosed?.classList.remove('hidden');
    } else if (pwdInput) {
      pwdInput.type = 'password';
      eyeOpen?.classList.remove('hidden');
      eyeClosed?.classList.add('hidden');
    }
  });
}

function closeDeleteModal() {
  pendingDeleteId = null;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.classList.add('hidden');
}

function setupStepBedsModal() {
  const modal = document.getElementById('stepBedsModal');
  const closeBtn = document.getElementById('closeStepBedsModalBtn');
  const cancelBtn = document.getElementById('cancelStepBedsBtn');
  const minusBtn = document.getElementById('stepMinusBtn');
  const plusBtn = document.getElementById('stepPlusBtn');
  const inputVal = document.getElementById('stepOccupiedVal');
  const saveBtn = document.getElementById('saveStepBedsBtn');

  const updateStepCalc = () => {
    const occ = Math.min(currentStepTotal, Math.max(0, parseInt(inputVal.value, 10) || 0));
    inputVal.value = occ;
    currentStepOccupied = occ;
    const avail = Math.max(0, currentStepTotal - currentStepOccupied);
    document.getElementById('stepCalculatedAvailable').textContent = avail;
  };

  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      inputVal.value = Math.max(0, (parseInt(inputVal.value, 10) || 0) - 1);
      updateStepCalc();
    });
  }

  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      inputVal.value = Math.min(currentStepTotal, (parseInt(inputVal.value, 10) || 0) + 1);
      updateStepCalc();
    });
  }

  if (inputVal) inputVal.addEventListener('input', updateStepCalc);

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (pendingStepId) {
        await updateOccupiedBedsOnly(pendingStepId, currentStepTotal, currentStepOccupied);
        showToast('Occupied beds count updated!', 'success');
        modal.classList.add('hidden');
      }
    });
  }
}

function openStepBedsModal(id, name, total, occupied) {
  pendingStepId = id;
  currentStepTotal = total;
  currentStepOccupied = occupied;

  document.getElementById('stepHospitalName').textContent = name;
  document.getElementById('stepTotalBeds').textContent = total;
  const inputVal = document.getElementById('stepOccupiedVal');
  if (inputVal) inputVal.value = occupied;

  document.getElementById('stepCalculatedAvailable').textContent = Math.max(0, total - occupied);

  const modal = document.getElementById('stepBedsModal');
  if (modal) modal.classList.remove('hidden');
}

// ================= Discharge Modal & billing =================
function setupDischargeModalListeners() {
  const modal = document.getElementById('dischargeModal');
  const closeBtn = document.getElementById('closeDischargeModalBtn');
  const cancelBtn = document.getElementById('cancelDischargeBtn');
  const confirmBtn = document.getElementById('confirmDischargeBtn');
  const actDischargeDateInput = document.getElementById('actualDischargeDate');

  const recalculateDischargeCost = () => {
    if (!pendingDischargeBooking) return;
    const disStr = actDischargeDateInput.value;
    const adm = new Date(pendingDischargeBooking.admissionDate);
    const rate = pendingDischargeBooking.costPerDay || 1500;
    
    document.getElementById('dischargeCostPerDay').textContent = `₹${rate.toLocaleString()}`;

    if (disStr) {
      const dis = new Date(disStr);
      if (dis >= adm) {
        const diffTime = Math.abs(dis - adm);
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const finalBill = diffDays * rate;

        document.getElementById('dischargeDays').textContent = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
        document.getElementById('dischargeFinalTotal').textContent = `₹${finalBill.toLocaleString()}`;
        document.getElementById('err-actualDischargeDate').textContent = '';
        return;
      }
    }
    document.getElementById('dischargeDays').textContent = `0 Days`;
    document.getElementById('dischargeFinalTotal').textContent = `₹0`;
  };

  if (actDischargeDateInput) {
    actDischargeDateInput.addEventListener('change', recalculateDischargeCost);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeDischargeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeDischargeModal);

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const dateVal = actDischargeDateInput.value;
      if (!dateVal) {
        document.getElementById('err-actualDischargeDate').textContent = 'Please select actual discharge date.';
        return;
      }

      confirmBtn.disabled = true;
      const res = await dischargePatient(pendingDischargeBooking.id, dateVal);
      confirmBtn.disabled = false;

      if (res.success) {
        showToast('Patient discharged successfully!', 'success');
        closeDischargeModal();
        closePatientDetailsDrawer();
      } else if (res.errors) {
        document.getElementById('err-actualDischargeDate').textContent = res.errors.actualDischargeDate || 'Invalid discharge date.';
      } else {
        showToast(res.message || 'Discharge process failed.', 'error');
      }
    });
  }
}

function openDischargeModal(booking) {
  pendingDischargeBooking = booking;

  document.getElementById('dischargePatientName').value = booking.patientName;
  document.getElementById('dischargeAdmissionDate').value = booking.admissionDate;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const actDischargeDateInput = document.getElementById('actualDischargeDate');
  if (actDischargeDateInput) {
    actDischargeDateInput.value = todayStr;
    actDischargeDateInput.min = booking.admissionDate;
  }

  const modal = document.getElementById('dischargeModal');
  if (modal) modal.classList.remove('hidden');

  if (actDischargeDateInput) {
    actDischargeDateInput.dispatchEvent(new Event('change'));
  }
}

function closeDischargeModal() {
  pendingDischargeBooking = null;
  const modal = document.getElementById('dischargeModal');
  if (modal) modal.classList.add('hidden');
}

// ================= Collapsible Sidebar Navigation =================
function setupCollapsibleSidebar() {
  const collapseBtn = document.getElementById('collapseSidebarBtn');
  const sidebar = document.getElementById('sidebar');
  
  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }
}

// ================= Mobile Sidebar Drawer =================
function setupMobileDrawer() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      if (sidebar) sidebar.classList.add('open');
      if (overlay) overlay.classList.add('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeMobileSidebar);
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

// ================= Header Current Date & Notifications Dropdown =================
function setupHeaderInteractions() {
  // Populate currentDate (legacy hidden element)
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
  }

  // Update Live Clock Ticking
  const clockTimeEl = document.getElementById('headerClockTime');
  const clockDateEl = document.getElementById('headerClockDate');

  function updateHeaderClock() {
    const now = new Date();
    if (clockTimeEl) {
      clockTimeEl.textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }
    if (clockDateEl) {
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const day = now.getDate();
      const month = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
      const year = now.getFullYear();
      clockDateEl.textContent = `${dayName}, ${day} ${month} ${year}`;
    }
  }

  if (clockTimeEl || clockDateEl) {
    updateHeaderClock();
    setInterval(updateHeaderClock, 1000);
  }

  // Bell Dropdown Toggle
  const bellBtn = document.getElementById('notificationBtn');
  const dropdown = document.getElementById('notificationDropdown');

  if (bellBtn && dropdown) {
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== bellBtn) {
        dropdown.classList.remove('active');
      }
    });
  }
}

// Initialize notification alerts
function processNewNotifications(bookings) {
  if (bookings.length === 0) return;
  
  // Clean logs and populate with realistic SaaS items
  const recentBookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  
  notificationLogs = recentBookings.map(b => {
    if (b.bookingStatus === 'Discharged') {
      return {
        message: `Patient ${escapeHtml(b.patientName)} (ID: ${escapeHtml(b.patientId)}) discharged.`,
        time: formatRelativeTime(b.updatedAt || b.createdAt)
      };
    }
    return {
      message: `Bed ${escapeHtml(b.bedNumber)} allocated for ${escapeHtml(b.patientName)}.`,
      time: formatRelativeTime(b.createdAt)
    };
  });
}

function updateNotificationFeed() {
  const listEl = document.getElementById('notificationList');
  const countEl = document.getElementById('notificationCount');

  if (!listEl) return;

  if (notificationLogs.length === 0) {
    listEl.innerHTML = `<div class="p-3 text-center text-muted text-xs">No recent capacity warnings or bookings.</div>`;
    if (countEl) countEl.textContent = '0 Alerts';
    return;
  }

  if (countEl) countEl.textContent = `${notificationLogs.length} Alerts`;

  listEl.innerHTML = notificationLogs.map(n => `
    <div class="notification-item">
      <span>${n.message}</span>
      <span class="notification-time">${n.time}</span>
    </div>
  `).join('');
}

// ================= Patient admissions Details Slide-out Drawer =================
function setupPatientDetailsDrawer() {
  const backdrop = document.getElementById('drawerBackdrop');
  const closeBtn = document.getElementById('closeDrawerBtn');
  const printBtn = document.getElementById('printSummaryBtn');
  const dischargeBtn = document.getElementById('drawerDischargeBtn');

  if (backdrop) backdrop.addEventListener('click', closePatientDetailsDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closePatientDetailsDrawer);

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      if (selectedBookingForDetail) {
        window.print();
      }
    });
  }

  if (dischargeBtn) {
    dischargeBtn.addEventListener('click', () => {
      if (selectedBookingForDetail) {
        openDischargeModal(selectedBookingForDetail);
      }
    });
  }
}

function openPatientDetailsDrawer(booking) {
  selectedBookingForDetail = booking;

  // Toggle drawer visibility classes
  const drawer = document.getElementById('patientDetailsDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  
  if (drawer) drawer.classList.add('active');
  if (backdrop) backdrop.classList.add('active');

  // Fill in profile details
  document.getElementById('dtPatientName').textContent = booking.patientName;
  document.getElementById('dtPatientId').textContent = booking.patientId;
  document.getElementById('dtPatientAgeGender').textContent = `${booking.age} yrs / ${booking.gender}`;
  document.getElementById('dtPatientPhone').textContent = booking.phone || '-';
  document.getElementById('dtEmergencyContact').textContent = booking.emergencyContact || '-';

  // Fill in Allocation info
  document.getElementById('dtHospitalName').textContent = booking.hospitalName;
  document.getElementById('dtDepartment').textContent = booking.department;
  document.getElementById('dtRoomType').textContent = booking.roomType;
  document.getElementById('dtRoomBed').textContent = `Room ${booking.roomNumber} - Bed ${booking.bedNumber}`;

  // Timeline
  document.getElementById('dtAdmissionDate').textContent = booking.admissionDate;
  document.getElementById('dtExpectedDischarge').textContent = booking.bookingStatus === 'Admitted' 
    ? `${booking.expectedDischargeDate} (Expected)` 
    : `${booking.actualDischargeDate} (Actual)`;

  const statusBadge = document.getElementById('dtStatusBadge');
  if (statusBadge) {
    statusBadge.textContent = booking.bookingStatus;
    statusBadge.className = `badge ${booking.bookingStatus === 'Admitted' ? 'badge-available' : 'badge-subtle'}`;
  }

  // Costings
  document.getElementById('dtCostPerDay').textContent = `₹${booking.costPerDay.toLocaleString()}`;
  document.getElementById('dtDuration').textContent = `${booking.numberOfDays} Day${booking.numberOfDays > 1 ? 's' : ''}`;
  document.getElementById('dtEstCost').textContent = `₹${booking.estimatedCost.toLocaleString()}`;
  document.getElementById('dtTotalBill').textContent = `₹${booking.estimatedCost.toLocaleString()}`;

  // Hide discharge button in drawer if already discharged
  const dischargeBtn = document.getElementById('drawerDischargeBtn');
  if (dischargeBtn) {
    if (booking.bookingStatus === 'Discharged') {
      dischargeBtn.classList.add('hidden');
    } else {
      dischargeBtn.classList.remove('hidden');
    }
  }
}

function closePatientDetailsDrawer() {
  const drawer = document.getElementById('patientDetailsDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
  selectedBookingForDetail = null;
}

// ================= User Portal Render Functions =================

function renderUserHospitalGrid() {
  const container = document.getElementById('userHospitalGrid');
  if (!container) return;

  const searchVal = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
  const filterLoc = document.getElementById('userLocationFilter')?.value || 'All';
  const filterDept = document.getElementById('userDepartmentFilter')?.value || 'All';

  const filtered = allHospitals.filter(h => {
    const matchesSearch = !searchVal || 
      (h.hospitalName && h.hospitalName.toLowerCase().includes(searchVal)) ||
      (h.location && h.location.toLowerCase().includes(searchVal));
    const matchesLoc = filterLoc === 'All' || h.location === filterLoc;
    const matchesDept = filterDept === 'All' || h.department === filterDept;
    return matchesSearch && matchesLoc && matchesDept;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="user-empty-state"><span class="user-empty-icon">🏥</span><h3>No Hospitals Found</h3><p>No hospital matches the filter criteria.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(h => {
    const pct = h.availabilityPercentage || 0;
    const statusColor = pct > 40 ? 'var(--accent-emerald)' : pct > 15 ? 'var(--accent-amber)' : 'var(--accent-red)';
    return `
      <div class="user-hospital-card" data-hospid="${h.id}">
        <div class="user-hosp-header">
          <div class="user-hosp-icon">🏥</div>
          <div>
            <div class="user-hosp-name">${escapeHtml(h.hospitalName)}</div>
            <div class="user-hosp-location">📍 ${escapeHtml(h.location)}</div>
          </div>
        </div>
        <div class="user-hosp-dept">${escapeHtml(h.department)}</div>
        <div class="user-hosp-stats">
          <div class="user-stat">
            <div class="user-stat-val">${h.totalBeds}</div>
            <div class="user-stat-lbl">Total Beds</div>
          </div>
          <div class="user-stat">
            <div class="user-stat-val" style="color:${statusColor}">${h.availableBeds}</div>
            <div class="user-stat-lbl">Available</div>
          </div>
          <div class="user-stat">
            <div class="user-stat-val">${h.occupiedBeds}</div>
            <div class="user-stat-lbl">Occupied</div>
          </div>
        </div>
        <div class="user-hosp-bar-wrap">
          <div class="user-hosp-bar" style="width:${pct}%; background:${statusColor};"></div>
        </div>
        <div class="user-hosp-footer">
          <span class="badge ${getBadgeClass(h.status)}">${h.status}</span>
          <button class="btn btn-primary btn-xs user-book-bed-btn" data-hospid="${h.id}" ${h.availableBeds === 0 ? 'disabled' : ''}>
            ${h.availableBeds === 0 ? 'Fully Occupied' : 'Request Bed'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.user-book-bed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const hospId = btn.getAttribute('data-hospid');
      // Pre-select hospital in available beds section
      const userHospSelect = document.getElementById('userHospSelect');
      if (userHospSelect) userHospSelect.value = hospId;
      switchSection('user-available-beds');
      renderUserAvailableBeds();
    });
  });
}

function renderUserAvailableBeds() {
  const container = document.getElementById('userBedsContainer');
  const userHospSelect = document.getElementById('userHospSelect');
  const userBedRoomTypeFilter = document.getElementById('userBedRoomTypeFilter');
  if (!container) return;

  const selectedHospId = userHospSelect ? userHospSelect.value : '';
  if (!selectedHospId) {
    container.innerHTML = `<div class="user-empty-state"><span class="user-empty-icon">🔍</span><h3>Select a Hospital</h3><p>Choose a hospital above to browse available beds.</p></div>`;
    return;
  }

  const hospital = allHospitals.find(h => h.id === selectedHospId);
  if (!hospital) {
    container.innerHTML = `<div class="user-empty-state"><span class="user-empty-icon">⚠️</span><h3>Hospital Not Found</h3></div>`;
    return;
  }

  const selectedRoomType = userBedRoomTypeFilter ? userBedRoomTypeFilter.value : 'All';

  const rooms = getRoomsAndBedsForHospital(hospital, allBookings);
  const filteredRooms = rooms.filter(r => {
    const matchesType = selectedRoomType === 'All' || r.roomType === selectedRoomType;
    const hasAvailableBeds = r.beds.some(b => b.status === 'Available');
    return matchesType && hasAvailableBeds;
  });

  if (filteredRooms.length === 0) {
    container.innerHTML = `<div class="user-empty-state"><span class="user-empty-icon">😔</span><h3>No Beds Available</h3><p>No beds matching your criteria are currently available.</p></div>`;
    return;
  }

  container.innerHTML = filteredRooms.map(room => {
    const tariff = ROOM_TARIFFS[room.roomType] || 1500;
    const availableBeds = room.beds.filter(b => b.status === 'Available');
    return `
      <div class="user-room-card">
        <div class="user-room-header">
          <div>
            <div class="user-room-title">Room ${room.roomNumber} <span class="badge badge-subtle">${room.roomType}</span></div>
            <div class="text-muted text-xs">₹${tariff.toLocaleString()}/day</div>
          </div>
          <div class="text-muted text-xs">${availableBeds.length} bed${availableBeds.length !== 1 ? 's' : ''} available</div>
        </div>
        <div class="user-beds-row">
          ${availableBeds.map(bed => `
            <button class="user-bed-btn" 
              data-hospid="${hospital.id}" data-hospname="${escapeHtml(hospital.hospitalName)}" 
              data-dept="${escapeHtml(hospital.department)}" data-roomtype="${room.roomType}"
              data-room="${room.roomNumber}" data-bed="${bed.bedNumber}">
              🛏 Bed ${bed.bedNumber}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Handle bed selection → navigate to booking form (pre-filled)
  container.querySelectorAll('.user-bed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const hospId = btn.getAttribute('data-hospid');
      const dept = btn.getAttribute('data-dept');
      const roomType = btn.getAttribute('data-roomtype');
      const roomNum = btn.getAttribute('data-room');
      const bedNum = btn.getAttribute('data-bed');

      prepopulateBookingForm(hospId, dept, roomType, roomNum, bedNum);
      switchSection('book-bed');
      showToast(`Selected Bed ${bedNum} in Room ${roomNum}. Fill in patient details below.`, 'info');
    });
  });
}

function renderUserMyBookings() {
  const container = document.getElementById('userMyBookingsContainer');
  if (!container) return;

  const userBookings = allBookings; // Already filtered by role in subscribeToBookings

  if (userBookings.length === 0) {
    container.innerHTML = `<div class="user-empty-state"><span class="user-empty-icon">📋</span><h3>No Bookings Yet</h3><p>You haven't made any bed booking requests. <a href="#user-available-beds" class="link-primary" onclick="event.preventDefault(); switchSection && switchSection('user-available-beds');">Browse available beds</a>.</p></div>`;
    return;
  }

  const statusMap = {
    'Pending': { cls: 'badge-warning', icon: '⏳' },
    'Admitted': { cls: 'badge-available', icon: '✅' },
    'Discharged': { cls: 'badge-subtle', icon: '🏠' },
    'Cancelled': { cls: 'badge-critical', icon: '❌' }
  };

  container.innerHTML = `
    <div class="user-bookings-list">
      ${userBookings.map(b => {
        const s = statusMap[b.bookingStatus] || { cls: 'badge-subtle', icon: '❓' };
        return `
          <div class="user-booking-card">
            <div class="user-booking-header">
              <div>
                <div class="user-booking-patient">${escapeHtml(b.patientName)}</div>
                <div class="text-muted text-xs">ID: ${escapeHtml(b.patientId)} | ${escapeHtml(b.gender)}, Age ${b.age}</div>
              </div>
              <span class="badge ${s.cls}">${s.icon} ${b.bookingStatus}</span>
            </div>
            <div class="user-booking-details">
              <div>🏥 ${escapeHtml(b.hospitalName)}</div>
              <div>🏢 ${escapeHtml(b.department)} — Room ${b.roomNumber}, Bed ${b.bedNumber}</div>
              <div>📅 Admission: ${b.admissionDate} | Discharge: ${b.expectedDischargeDate}</div>
              <div>💰 Estimated Cost: <strong>₹${(b.estimatedCost || 0).toLocaleString()}</strong></div>
            </div>
            ${b.bookingStatus === 'Pending' ? `
              <div class="user-booking-footer">
                <span class="text-muted text-xs">⏳ Awaiting hospital approval</span>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ================= Admin Booking Approvals Table =================
function renderAdminBookingsTable() {
  const tbody = document.getElementById('adminBookingsTableBody');
  if (!tbody) return;

  const allAdminBookings = allBookings;

  if (allAdminBookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No booking requests found.</td></tr>`;
    return;
  }

  const statusMap = {
    'Pending': 'badge-warning',
    'Admitted': 'badge-available',
    'Discharged': 'badge-subtle',
    'Cancelled': 'badge-critical'
  };

  tbody.innerHTML = allAdminBookings.map(b => {
    const statusClass = statusMap[b.bookingStatus] || 'badge-subtle';
    return `
      <tr>
        <td><strong>${escapeHtml(b.patientName)}</strong><br><span class="text-xs text-muted">${escapeHtml(b.patientId)}</span></td>
        <td>${escapeHtml(b.hospitalName)}</td>
        <td>${escapeHtml(b.department)}</td>
        <td>Room ${b.roomNumber} – Bed ${b.bedNumber}</td>
        <td><span class="badge ${statusClass}">${b.bookingStatus}</span></td>
        <td>${b.admissionDate}</td>
        <td>
          ${b.bookingStatus === 'Pending' ? `
            <button class="btn btn-success btn-xs admin-confirm-btn" data-id="${b.id}" style="margin-right:4px;">✅ Approve</button>
            <button class="btn btn-outline-danger btn-xs admin-reject-btn" data-id="${b.id}">❌ Reject</button>
          ` : b.bookingStatus === 'Admitted' ? `
            <button class="btn btn-outline-danger btn-xs discharge-btn" data-id="${b.id}">Discharge</button>
          ` : `<span class="text-muted text-xs">Closed</span>`}
        </td>
      </tr>
    `;
  }).join('');

  // Admin approve booking
  tbody.querySelectorAll('.admin-confirm-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const id = btn.getAttribute('data-id');
      const res = await confirmPatientBooking(id);
      if (res.success) {
        showToast('Booking approved and patient admitted!', 'success');
        renderAdminBookingsTable();
      } else {
        showToast(res.message || 'Approval failed.', 'error');
        btn.disabled = false;
      }
    });
  });

  // Admin reject booking
  tbody.querySelectorAll('.admin-reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const id = btn.getAttribute('data-id');
      const res = await cancelPatientBooking(id);
      if (res.success) {
        showToast('Booking request rejected.', 'info');
        renderAdminBookingsTable();
      } else {
        showToast(res.message || 'Rejection failed.', 'error');
        btn.disabled = false;
      }
    });
  });

  // Discharge admitted patient
  tbody.querySelectorAll('.discharge-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const booking = allBookings.find(b => b.id === id);
      if (booking) openDischargeModal(booking);
    });
  });
}

// ================= Toast Notification System =================
export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconHtml = 'ℹ️';
  if (type === 'success') iconHtml = '✅';
  if (type === 'error') iconHtml = '⚠️';

  toast.innerHTML = `
    <span>${iconHtml}</span>
    <div>${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
