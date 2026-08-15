import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDcKNEImsvouj03dKqVyAHZ4JTUhYhp4mc",
  authDomain: "pulsebed-tracker.firebaseapp.com",
  projectId: "pulsebed-tracker"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SAMPLE_HOSPITALS = [
  {
    hospitalName: 'Apollo Hospital',
    location: 'Downtown Central, Jubilee Hills',
    department: 'ICU',
    totalBeds: 120,
    occupiedBeds: 102,
    status: 'Limited',
    availableBeds: 18,
    availabilityPercentage: 15,
    updatedAt: new Date().toISOString()
  },
  {
    hospitalName: 'City Care Hospital',
    location: 'North Wing, Park Avenue',
    department: 'Emergency',
    totalBeds: 80,
    occupiedBeds: 75,
    status: 'Critical',
    availableBeds: 5,
    availabilityPercentage: 6.25,
    updatedAt: new Date().toISOString()
  },
  {
    hospitalName: 'Government General Hospital',
    location: 'Civic District, Main Blvd',
    department: 'General Ward',
    totalBeds: 350,
    occupiedBeds: 210,
    status: 'Available',
    availableBeds: 140,
    availabilityPercentage: 40,
    updatedAt: new Date().toISOString()
  },
  {
    hospitalName: 'LifeCare Medical Center',
    location: 'East Side Campus, 5th St',
    department: 'Maternity',
    totalBeds: 60,
    occupiedBeds: 15,
    status: 'Available',
    availableBeds: 45,
    availabilityPercentage: 75,
    updatedAt: new Date().toISOString()
  },
  {
    hospitalName: 'Sunrise Children Hospital',
    location: 'West Suburbs, Green Way',
    department: 'Pediatrics',
    totalBeds: 90,
    occupiedBeds: 85,
    status: 'Critical',
    availableBeds: 5,
    availabilityPercentage: 5.5,
    updatedAt: new Date().toISOString()
  },
  {
    hospitalName: 'St. Jude Specialty Care',
    location: 'Metro South, Tower B',
    department: 'ICU',
    totalBeds: 50,
    occupiedBeds: 50,
    status: 'Full',
    availableBeds: 0,
    availabilityPercentage: 0,
    updatedAt: new Date().toISOString()
  }
];

const users = [
  { email: 'admin@hospital.org', password: 'admin123', role: 'ADMIN', name: 'Admin Clinician' },
  { email: 'staff@hospital.org', password: 'admin123', role: 'STAFF', name: 'Duty Staff' },
  { email: 'patient@example.com', password: 'patient123', role: 'USER', name: 'John Doe (Patient)' }
];

async function seed() {
  console.log("Starting Firebase Authentication & Firestore seeding...");

  // 1. Create Users
  for (const user of users) {
    try {
      console.log(`Creating user: ${user.email}...`);
      const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
      const uid = userCredential.user.uid;

      console.log(`User created. Writing profile for UID: ${uid} with role: ${user.role}...`);
      await setDoc(doc(db, 'users', uid), {
        uid: uid,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: new Date().toISOString()
      });
      console.log(`Successfully set profile for ${user.email}.`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        console.log(`User ${user.email} already exists in Firebase Auth.`);
        // Try logging in to get uid and make sure Firestore profile exists
        try {
          const userCredential = await signInWithEmailAndPassword(auth, user.email, user.password);
          const uid = userCredential.user.uid;
          console.log(`Writing/updating profile for UID: ${uid} with role: ${user.role}...`);
          await setDoc(doc(db, 'users', uid), {
            uid: uid,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (loginErr) {
          console.error(`Could not update existing user profile: ${loginErr.message}`);
        }
      } else {
        console.error(`Error creating user ${user.email}: ${e.message}`);
      }
    }
  }

  // 2. Seed Hospitals
  console.log("Seeding hospitals collection...");
  for (const hosp of SAMPLE_HOSPITALS) {
    try {
      console.log(`Adding hospital: ${hosp.hospitalName}...`);
      await addDoc(collection(db, 'hospitals'), hosp);
    } catch (e) {
      console.error(`Error adding hospital ${hosp.hospitalName}: ${e.message}`);
    }
  }

  console.log("Seeding process completed successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Fatal Seeding Error:", err);
  process.exit(1);
});
