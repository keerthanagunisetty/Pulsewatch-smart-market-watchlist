// ==========================================================================
// Firestore Data Service & Real-Time Subscription Manager
// ==========================================================================

import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { db, isCloudFirebaseActive } from './firebase-config.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';

const COLLECTION_NAME = 'hospitals';
const BOOKINGS_COLLECTION = 'patientBookings';

const LOCAL_STORAGE_HOSPITALS_KEY = 'pulsebed_hospitals_data';
const LOCAL_STORAGE_BOOKINGS_KEY = 'pulsebed_bookings_data';

// Tariff Lookup rates
export const ROOM_TARIFFS = {
  'General Ward': 1500,
  'Semi-Private': 2500,
  'Private Room': 4000,
  'ICU': 8000,
  'Emergency': 5000
};

// Local Reactive Subscription Stores
let localListeners = [];
let bookingsListeners = [];

// Sample Demo Data Set
export const SAMPLE_HOSPITALS = [
  {
    hospitalName: 'Apollo Hospital',
    location: 'Downtown Central, Jubilee Hills',
    department: 'ICU',
    totalBeds: 120,
    occupiedBeds: 102
  },
  {
    hospitalName: 'City Care Hospital',
    location: 'North Wing, Park Avenue',
    department: 'Emergency',
    totalBeds: 80,
    occupiedBeds: 75
  },
  {
    hospitalName: 'Government General Hospital',
    location: 'Civic District, Main Blvd',
    department: 'General Ward',
    totalBeds: 350,
    occupiedBeds: 210
  },
  {
    hospitalName: 'LifeCare Medical Center',
    location: 'East Side Campus, 5th St',
    department: 'Maternity',
    totalBeds: 60,
    occupiedBeds: 15
  },
  {
    hospitalName: 'Sunrise Children Hospital',
    location: 'West Suburbs, Green Way',
    department: 'Pediatrics',
    totalBeds: 90,
    occupiedBeds: 85
  },
  {
    hospitalName: 'St. Jude Specialty Care',
    location: 'Metro South, Tower B',
    department: 'ICU',
    totalBeds: 50,
    occupiedBeds: 50
  }
];

// Helper: Calculate Available Beds and Bed Status Percentage
export function calculateBedMetrics(totalBeds, occupiedBeds) {
  const total = parseInt(totalBeds, 10) || 0;
  const occupied = parseInt(occupiedBeds, 10) || 0;
  const available = Math.max(0, total - occupied);
  const percentage = total > 0 ? (available / total) * 100 : 0;

  let status = 'Available';
  if (percentage === 0) {
    status = 'Full';
  } else if (percentage > 0 && percentage < 10) {
    status = 'Critical';
  } else if (percentage >= 10 && percentage <= 30) {
    status = 'Limited';
  } else {
    status = 'Available';
  }

  return {
    totalBeds: total,
    occupiedBeds: occupied,
    availableBeds: available,
    availabilityPercentage: Math.round(percentage * 10) / 10,
    status
  };
}

// Validation Helper
export function validateHospitalData(data) {
  const errors = {};

  if (!data.hospitalName || !data.hospitalName.trim()) {
    errors.hospitalName = 'Hospital name is required.';
  }

  if (!data.location || !data.location.trim()) {
    errors.location = 'Location is required.';
  }

  if (!data.department || !data.department.trim()) {
    errors.department = 'Department is required.';
  }

  const total = parseInt(data.totalBeds, 10);
  if (isNaN(total) || total <= 0) {
    errors.totalBeds = 'Total beds must be a positive number greater than 0.';
  }

  const occupied = parseInt(data.occupiedBeds, 10);
  if (isNaN(occupied) || occupied < 0) {
    errors.occupiedBeds = 'Occupied beds cannot be negative.';
  } else if (!isNaN(total) && occupied > total) {
    errors.occupiedBeds = `Occupied beds (${occupied}) cannot exceed Total beds (${total}).`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Local Storage Helper Functions
function getLocalHospitals() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HOSPITALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalHospitals(list) {
  localStorage.setItem(LOCAL_STORAGE_HOSPITALS_KEY, JSON.stringify(list));
  notifyLocalListeners(list);
}

function notifyLocalListeners(list) {
  localListeners.forEach(cb => cb(list));
}

function getLocalBookings() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalBookings(list) {
  localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(list));
  notifyBookingsListeners(list);
}

function notifyBookingsListeners(list) {
  bookingsListeners.forEach(cb => {
    const user = getCurrentUser();
    const role = getCurrentUserRole();
    let filtered = list;
    if (user && role === 'USER') {
      filtered = list.filter(b => b.userId === user.uid);
    }
    cb(filtered);
  });
}

// Subscribe to Real-Time Updates (Firestore onSnapshot or Local Sub)
export function subscribeToHospitals(onDataCallback) {
  if (isCloudFirebaseActive && db) {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      return onSnapshot(colRef, (snapshot) => {
        const hospitals = [];
        snapshot.forEach((docSnap) => {
          const item = docSnap.data();
          hospitals.push({
            id: docSnap.id,
            ...item
          });
        });
        // Sort by updatedAt descending
        hospitals.sort((a, b) => (b.updatedAtMillis || 0) - (a.updatedAtMillis || 0));
        onDataCallback(hospitals);
      }, (error) => {
        console.warn("Firestore snapshot error, falling back to local store:", error);
        fallbackToLocalSubscription(onDataCallback);
      });
    } catch (err) {
      console.warn("Snapshot setup failed:", err);
      return fallbackToLocalSubscription(onDataCallback);
    }
  } else {
    return fallbackToLocalSubscription(onDataCallback);
  }
}

function fallbackToLocalSubscription(onDataCallback) {
  localListeners.push(onDataCallback);

  let current = getLocalHospitals();
  // Auto-seed local storage if completely empty for immediate demonstration
  if (current.length === 0) {
    current = SAMPLE_HOSPITALS.map((item, idx) => {
      const metrics = calculateBedMetrics(item.totalBeds, item.occupiedBeds);
      return {
        id: 'local_hosp_' + (idx + 1) + '_' + Date.now(),
        hospitalName: item.hospitalName,
        location: item.location,
        department: item.department,
        ...metrics,
        updatedAt: new Date().toISOString(),
        updatedAtMillis: Date.now() - idx * 60000
      };
    });
    localStorage.setItem(LOCAL_STORAGE_HOSPITALS_KEY, JSON.stringify(current));
  }

  onDataCallback(current);

  return () => {
    localListeners = localListeners.filter(cb => cb !== onDataCallback);
  };
}

// Subscribe to Bookings snapshots
export function subscribeToBookings(onDataCallback) {
  const user = getCurrentUser();
  const role = getCurrentUserRole();

  if (isCloudFirebaseActive && db) {
    try {
      let q = collection(db, BOOKINGS_COLLECTION);
      if (user && role === 'USER') {
        q = query(collection(db, BOOKINGS_COLLECTION), where("userId", "==", user.uid));
      }
      return onSnapshot(q, (snapshot) => {
        const bookings = [];
        snapshot.forEach((docSnap) => {
          bookings.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });
        bookings.sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
        onDataCallback(bookings);
      }, (error) => {
        console.warn("Firestore bookings snapshot error:", error);
        fallbackToBookingsSubscription(onDataCallback);
      });
    } catch (err) {
      console.warn("Firestore bookings snapshot setup failed:", err);
      return fallbackToBookingsSubscription(onDataCallback);
    }
  } else {
    return fallbackToBookingsSubscription(onDataCallback);
  }
}

function fallbackToBookingsSubscription(onDataCallback) {
  bookingsListeners.push(onDataCallback);
  const allBookingsList = getLocalBookings();
  const user = getCurrentUser();
  const role = getCurrentUserRole();
  let filtered = allBookingsList;
  if (user && role === 'USER') {
    filtered = allBookingsList.filter(b => b.userId === user.uid);
  }
  onDataCallback(filtered);
  return () => {
    bookingsListeners = bookingsListeners.filter(cb => cb !== onDataCallback);
  };
}

// Add Hospital Record
export async function addHospital(formData) {
  const validation = validateHospitalData(formData);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  const metrics = calculateBedMetrics(formData.totalBeds, formData.occupiedBeds);
  const nowISO = new Date().toISOString();
  const nowMillis = Date.now();

  const record = {
    hospitalName: formData.hospitalName.trim(),
    location: formData.location.trim(),
    department: formData.department.trim(),
    totalBeds: metrics.totalBeds,
    occupiedBeds: metrics.occupiedBeds,
    availableBeds: metrics.availableBeds,
    status: metrics.status,
    updatedAt: nowISO,
    updatedAtMillis: nowMillis
  };

  if (isCloudFirebaseActive && db) {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const docRef = await addDoc(colRef, {
        ...record,
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (e) {
      console.warn("Firestore addDoc error, using local fallback:", e);
    }
  }

  // Fallback Local Store
  const localList = getLocalHospitals();
  const newObj = { id: 'local_' + Date.now(), ...record };
  localList.unshift(newObj);
  saveLocalHospitals(localList);
  return { success: true, id: newObj.id };
}

// Update Hospital Record
export async function updateHospital(id, formData) {
  const validation = validateHospitalData(formData);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  const metrics = calculateBedMetrics(formData.totalBeds, formData.occupiedBeds);
  const nowISO = new Date().toISOString();
  const nowMillis = Date.now();

  const record = {
    hospitalName: formData.hospitalName.trim(),
    location: formData.location.trim(),
    department: formData.department.trim(),
    totalBeds: metrics.totalBeds,
    occupiedBeds: metrics.occupiedBeds,
    availableBeds: metrics.availableBeds,
    status: metrics.status,
    updatedAt: nowISO,
    updatedAtMillis: nowMillis
  };

  if (isCloudFirebaseActive && db && !id.startsWith('local_')) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...record,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (e) {
      console.warn("Firestore updateDoc error:", e);
    }
  }

  // Fallback Local Store
  const localList = getLocalHospitals();
  const index = localList.findIndex(item => item.id === id);
  if (index !== -1) {
    localList[index] = { ...localList[index], ...record };
    saveLocalHospitals(localList);
    return { success: true };
  }

  return { success: false, message: 'Hospital record not found.' };
}

// Quick Update Occupied Beds
export async function updateOccupiedBedsOnly(id, currentTotal, newOccupied) {
  const localList = getLocalHospitals();
  const existing = localList.find(i => i.id === id);

  const formPayload = {
    hospitalName: existing ? existing.hospitalName : 'Hospital',
    location: existing ? existing.location : 'Location',
    department: existing ? existing.department : 'General Ward',
    totalBeds: currentTotal,
    occupiedBeds: newOccupied
  };

  return await updateHospital(id, formPayload);
}

// Delete Hospital Record
export async function deleteHospital(id) {
  if (isCloudFirebaseActive && db && !id.startsWith('local_')) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      return { success: true };
    } catch (e) {
      console.warn("Firestore deleteDoc error:", e);
    }
  }

  // Fallback Local Store
  let localList = getLocalHospitals();
  localList = localList.filter(item => item.id !== id);
  saveLocalHospitals(localList);
  return { success: true };
}

// Seed Sample Data
export async function seedSampleHospitals() {
  for (const item of SAMPLE_HOSPITALS) {
    await addHospital(item);
  }
  return { success: true, count: SAMPLE_HOSPITALS.length };
}

// Clear All Hospital Data
export async function clearAllHospitals() {
  if (isCloudFirebaseActive && db) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      const bkSnap = await getDocs(collection(db, BOOKINGS_COLLECTION));
      const bkBatch = writeBatch(db);
      bkSnap.docs.forEach((d) => bkBatch.delete(d.ref));
      await bkBatch.commit();
    } catch (e) {
      console.warn("Batch delete Firestore failed:", e);
    }
  }
  saveLocalHospitals([]);
  saveLocalBookings([]);
  return { success: true };
}

// =========================================================================
// Visual Room & Beds Dynamic Generation Engine
// =========================================================================

export function getRoomsAndBedsForHospital(hospital, activeBookings = []) {
  if (!hospital) return [];

  const total = parseInt(hospital.totalBeds, 10) || 0;
  const dept = hospital.department || 'General Ward';
  
  // Decide Room Type and Beds per Room based on department
  let roomType = 'General Ward';
  let bedsPerRoom = 6;
  
  if (dept === 'ICU') {
    roomType = 'ICU';
    bedsPerRoom = 2;
  } else if (dept === 'Emergency') {
    roomType = 'Emergency';
    bedsPerRoom = 4;
  } else if (dept === 'General Ward') {
    roomType = 'General Ward';
    bedsPerRoom = 6;
  }

  // Generate deterministic rooms
  const rooms = [];
  let bedCounter = 1;
  let roomCounter = 101;

  while (bedCounter <= total) {
    let currentRoomType = roomType;
    let currentBedsPerRoom = bedsPerRoom;
    
    // For Mixed Departments, distribute different room types
    if (dept !== 'ICU' && dept !== 'Emergency' && dept !== 'General Ward') {
      if (roomCounter % 3 === 1) {
        currentRoomType = 'Private Room';
        currentBedsPerRoom = 1;
      } else if (roomCounter % 3 === 2) {
        currentRoomType = 'Semi-Private';
        currentBedsPerRoom = 2;
      } else {
        currentRoomType = 'General Ward';
        currentBedsPerRoom = 6;
      }
    }
    
    const currentCost = ROOM_TARIFFS[currentRoomType] || 1500;
    const roomBeds = [];
    
    for (let b = 1; b <= currentBedsPerRoom && bedCounter <= total; b++) {
      const bedNumber = `${roomCounter}-${String.fromCharCode(64 + b)}`; // e.g. 101-A, 101-B
      
      // Look for active booking matching this bed
      const activeBooking = activeBookings.find(bk => 
        bk.bookingStatus === 'Admitted' &&
        bk.hospitalId === hospital.id &&
        bk.roomNumber === roomCounter.toString() &&
        bk.bedNumber === bedNumber
      );
      
      roomBeds.push({
        bedNumber,
        status: activeBooking ? 'Occupied' : 'Available',
        patientName: activeBooking ? activeBooking.patientName : null,
        patientId: activeBooking ? activeBooking.patientId : null,
        bookingId: activeBooking ? activeBooking.id : null
      });
      
      bedCounter++;
    }

    rooms.push({
      roomNumber: roomCounter,
      roomType: currentRoomType,
      costPerDay: currentCost,
      beds: roomBeds
    });

    roomCounter++;
  }

  // Synchronise deterministic occupied beds to match hospital.occupiedBeds count!
  // If the count of active bookings is less than hospital.occupiedBeds,
  // we mark additional beds as Occupied to prevent inconsistencies.
  let occupiedCount = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'Occupied').length, 0);
  const targetOccupiedCount = parseInt(hospital.occupiedBeds, 10) || 0;
  
  if (occupiedCount < targetOccupiedCount) {
    const diff = targetOccupiedCount - occupiedCount;
    let allocated = 0;
    
    for (const r of rooms) {
      for (const b of r.beds) {
        if (b.status === 'Available' && allocated < diff) {
          b.status = 'Occupied';
          b.patientName = 'Simulated Patient';
          b.patientId = 'SIM-' + Math.floor(1000 + Math.random() * 9000);
          allocated++;
        }
      }
    }
  }

  return rooms;
}

// Add Patient Booking
export async function addPatientBooking(bookingData) {
  const errors = {};
  if (!bookingData.patientName || !bookingData.patientName.trim()) errors.patientName = 'Patient Name is required';
  if (!bookingData.patientId || !bookingData.patientId.trim()) errors.patientId = 'Patient ID is required';
  if (!bookingData.patientAge || bookingData.patientAge <= 0) errors.patientAge = 'Invalid Patient Age';
  if (!bookingData.patientGender) errors.patientGender = 'Gender is required';
  if (!bookingData.patientPhone || !bookingData.patientPhone.trim()) errors.patientPhone = 'Phone Number is required';
  if (!bookingData.patientEmergencyContact || !bookingData.patientEmergencyContact.trim()) errors.patientEmergencyContact = 'Emergency Contact is required';
  if (!bookingData.hospitalId) errors.hospitalId = 'Hospital selection is required';
  if (!bookingData.department) errors.department = 'Department is required';
  if (!bookingData.roomType) errors.roomType = 'Room Type is required';
  if (!bookingData.roomNumber) errors.roomNumber = 'Room selection is required';
  if (!bookingData.bedNumber) errors.bedNumber = 'Bed selection is required';
  
  const admDate = new Date(bookingData.admissionDate);
  const disDate = new Date(bookingData.expectedDischargeDate);
  if (isNaN(admDate.getTime())) errors.admissionDate = 'Invalid Admission Date';
  if (isNaN(disDate.getTime())) errors.expectedDischargeDate = 'Invalid Expected Discharge Date';
  if (disDate < admDate) errors.expectedDischargeDate = 'Discharge date cannot be before admission date';

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // Calculate duration and estimated cost
  const diffTime = Math.abs(disDate - admDate);
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const costPerDay = ROOM_TARIFFS[bookingData.roomType] || 1500;
  const estimatedCost = diffDays * costPerDay;

  const nowISO = new Date().toISOString();
  const nowMillis = Date.now();

  // Check if patient ID is already booked & active
  const bookings = getLocalBookings();
  const doubleBooked = bookings.some(b => b.patientId === bookingData.patientId && b.bookingStatus === 'Admitted');
  if (doubleBooked) {
    return { success: false, message: `Patient with ID ${bookingData.patientId} is already admitted.` };
  }

  // Double check bed double booking
  const bedBooked = bookings.some(b => 
    b.bookingStatus === 'Admitted' &&
    b.hospitalId === bookingData.hospitalId &&
    b.roomNumber === bookingData.roomNumber.toString() &&
    b.bedNumber === bookingData.bedNumber
  );
  if (bedBooked) {
    return { success: false, message: `Bed ${bookingData.bedNumber} in Room ${bookingData.roomNumber} is already occupied.` };
  }

  const user = getCurrentUser();
  const role = getCurrentUserRole();
  const isUserBooking = (role === 'USER');

  const record = {
    patientName: bookingData.patientName.trim(),
    patientId: bookingData.patientId.trim(),
    age: parseInt(bookingData.patientAge, 10),
    gender: bookingData.patientGender,
    phone: bookingData.patientPhone.trim(),
    emergencyContact: bookingData.patientEmergencyContact.trim(),
    hospitalId: bookingData.hospitalId,
    hospitalName: bookingData.hospitalName,
    department: bookingData.department,
    roomType: bookingData.roomType,
    roomNumber: bookingData.roomNumber.toString(),
    bedNumber: bookingData.bedNumber,
    costPerDay,
    admissionDate: bookingData.admissionDate,
    expectedDischargeDate: bookingData.expectedDischargeDate,
    numberOfDays: diffDays,
    estimatedCost,
    bookingStatus: isUserBooking ? 'Pending' : 'Admitted',
    userId: isUserBooking ? user.uid : (bookingData.userId || ''),
    createdAt: nowISO,
    createdAtMillis: nowMillis
  };

  // 2. Save Patient Booking
  let savedId = 'local_bk_' + Date.now();
  
  if (isCloudFirebaseActive && db) {
    try {
      const colRef = collection(db, BOOKINGS_COLLECTION);
      const docRef = await addDoc(colRef, {
        ...record,
        createdAt: serverTimestamp()
      });
      savedId = docRef.id;
    } catch (e) {
      console.warn("Firestore addDoc booking error, using local fallback:", e);
    }
  }

  // Fallback Local Storage Save
  const bookingsList = getLocalBookings();
  const newBooking = { id: savedId, ...record };
  bookingsList.unshift(newBooking);
  saveLocalBookings(bookingsList);

  // 3. Update Hospital Occupied Count (+1) ONLY IF it is not a pending user booking request!
  if (!isUserBooking) {
    const localHospitals = getLocalHospitals();
    const hospitalRecord = localHospitals.find(h => h.id === bookingData.hospitalId);
    if (hospitalRecord) {
      const nextOccupied = Math.min(hospitalRecord.totalBeds, hospitalRecord.occupiedBeds + 1);
      await updateOccupiedBedsOnly(bookingData.hospitalId, hospitalRecord.totalBeds, nextOccupied);
    }
  }

  return { success: true, booking: newBooking };
}

// Discharge Patient
export async function dischargePatient(bookingId, actualDischargeDate) {
  if (!actualDischargeDate) {
    return { success: false, errors: { actualDischargeDate: 'Actual Discharge Date is required' } };
  }

  const bookingsList = getLocalBookings();
  const booking = bookingsList.find(b => b.id === bookingId);
  if (!booking) {
    return { success: false, message: 'Patient booking record not found.' };
  }

  const admDate = new Date(booking.admissionDate);
  const actDisDate = new Date(actualDischargeDate);
  if (actDisDate < admDate) {
    return { success: false, errors: { actualDischargeDate: 'Discharge date cannot be before admission date.' } };
  }

  // Recalculate Stay duration & Final Cost
  const diffTime = Math.abs(actDisDate - admDate);
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const finalCost = diffDays * booking.costPerDay;

  const nowISO = new Date().toISOString();

  // 1. Update Booking status to Discharged
  const updatedBooking = {
    ...booking,
    bookingStatus: 'Discharged',
    actualDischargeDate,
    numberOfDays: diffDays,
    estimatedCost: finalCost,
    updatedAt: nowISO
  };

  if (isCloudFirebaseActive && db && !bookingId.startsWith('local_')) {
    try {
      const docRef = doc(db, BOOKINGS_COLLECTION, bookingId);
      await updateDoc(docRef, {
        bookingStatus: 'Discharged',
        actualDischargeDate,
        numberOfDays: diffDays,
        estimatedCost: finalCost,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Firestore discharge update failed:", e);
    }
  }

  // Local Storage Save Update
  const index = bookingsList.findIndex(b => b.id === bookingId);
  if (index !== -1) {
    bookingsList[index] = updatedBooking;
    saveLocalBookings(bookingsList);
  }

  // 2. Update Hospital Occupied Count (-1)
  const localHospitals = getLocalHospitals();
  const hospitalRecord = localHospitals.find(h => h.id === booking.hospitalId);
  if (hospitalRecord) {
    const nextOccupied = Math.max(0, hospitalRecord.occupiedBeds - 1);
    await updateOccupiedBedsOnly(booking.hospitalId, hospitalRecord.totalBeds, nextOccupied);
  }

  return { success: true };
}

// Confirm Patient Booking Request (Admin Approval)
export async function confirmPatientBooking(bookingId) {
  const bookingsList = getLocalBookings();
  const booking = bookingsList.find(b => b.id === bookingId);
  if (!booking) {
    return { success: false, message: 'Booking record not found.' };
  }

  const nextStatus = 'Admitted'; // Matches existing admitted states

  if (isCloudFirebaseActive && db && !bookingId.startsWith('local_')) {
    try {
      const docRef = doc(db, BOOKINGS_COLLECTION, bookingId);
      await updateDoc(docRef, {
        bookingStatus: nextStatus,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Firestore confirm update failed:", e);
    }
  }

  // Local Storage Save Update
  const updatedBooking = { ...booking, bookingStatus: nextStatus, updatedAt: new Date().toISOString() };
  const index = bookingsList.findIndex(b => b.id === bookingId);
  if (index !== -1) {
    bookingsList[index] = updatedBooking;
    saveLocalBookings(bookingsList);
  }

  // Update Hospital Occupied Count (+1)
  const localHospitals = getLocalHospitals();
  const hospitalRecord = localHospitals.find(h => h.id === booking.hospitalId);
  if (hospitalRecord) {
    const nextOccupied = Math.min(hospitalRecord.totalBeds, hospitalRecord.occupiedBeds + 1);
    await updateOccupiedBedsOnly(booking.hospitalId, hospitalRecord.totalBeds, nextOccupied);
  }

  return { success: true };
}

// Cancel / Reject Patient Booking Request
export async function cancelPatientBooking(bookingId) {
  const bookingsList = getLocalBookings();
  const booking = bookingsList.find(b => b.id === bookingId);
  if (!booking) {
    return { success: false, message: 'Booking record not found.' };
  }

  const prevStatus = booking.bookingStatus;
  const nextStatus = 'Cancelled';

  if (isCloudFirebaseActive && db && !bookingId.startsWith('local_')) {
    try {
      const docRef = doc(db, BOOKINGS_COLLECTION, bookingId);
      await updateDoc(docRef, {
        bookingStatus: nextStatus,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Firestore cancel update failed:", e);
    }
  }

  // Local Storage Save Update
  const updatedBooking = { ...booking, bookingStatus: nextStatus, updatedAt: new Date().toISOString() };
  const index = bookingsList.findIndex(b => b.id === bookingId);
  if (index !== -1) {
    bookingsList[index] = updatedBooking;
    saveLocalBookings(bookingsList);
  }

  // If the booking was active (Admitted), release the occupied bed count
  if (prevStatus === 'Admitted') {
    const localHospitals = getLocalHospitals();
    const hospitalRecord = localHospitals.find(h => h.id === booking.hospitalId);
    if (hospitalRecord) {
      const nextOccupied = Math.max(0, hospitalRecord.occupiedBeds - 1);
      await updateOccupiedBedsOnly(booking.hospitalId, hospitalRecord.totalBeds, nextOccupied);
    }
  }

  return { success: true };
}
