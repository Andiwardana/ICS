import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, query, collection, where, orderBy, limit, getDocs, addDoc, serverTimestamp, Timestamp, getDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'employee' | 'admin';
  createdAt: any;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  category: 'Customer' | 'Others';
  attendanceType: 'ABSENSI' | 'TERLAMBAT' | 'IZIN';
  employeeType: 'Employee' | 'Kurir' | 'Teknisi';
  shifting: string;
  reason?: string;
  timestamp: Timestamp;
  location: {
    latitude: number;
    longitude: number;
  };
  photoBase64?: string;
}

// --- Error Handling ---

interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string | null;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: any[];
  }
}

function handleFirestoreError(err: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null): never {
  const authUser = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: err.message,
    operationType,
    path,
    authInfo: {
      userId: authUser?.uid || null,
      email: authUser?.email || null,
      emailVerified: authUser?.emailVerified || false,
      isAnonymous: authUser?.isAnonymous || false,
      providerInfo: authUser?.providerData || []
    }
  };
  throw new Error(JSON.stringify(errorInfo));
}

// --- Connection Test ---
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message.includes('permission-denied')) {
      console.warn("Connection test failed (expected if 'test' collection is blocked), but rules are active.");
    } else if (error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// --- Firestore Helpers ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    return handleFirestoreError(error, 'get', `users/${uid}`);
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  try {
    await setDoc(doc(db, 'users', profile.uid), {
      ...profile,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'create', `users/${profile.uid}`);
  }
}

export async function addAttendance(record: Omit<AttendanceRecord, 'id' | 'timestamp'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'attendance'), {
      ...record,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, 'create', 'attendance');
  }
}

export async function getAttendanceHistory(userId: string, limitCount = 50): Promise<AttendanceRecord[]> {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AttendanceRecord[];
  } catch (error) {
    handleFirestoreError(error, 'list', 'attendance');
  }
}
