/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  History, 
  User, 
  LogOut, 
  LogIn as LoginIcon,
  CircleUser,
  Navigation,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Briefcase,
  ChevronDown,
  Save,
  Key,
  Maximize2,
  Eye,
  X,
  TrendingUp,
  BarChart3,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  auth, 
  db, 
  AttendanceRecord,
  UserProfile,
  addAttendance,
  getAttendanceHistory,
  createUserProfile,
  getUserProfile
} from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, sublabel }: any) => {
  const variants: any = {
    primary: 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 active:scale-95 transition-transform',
    secondary: 'bg-white text-slate-800 border-2 border-slate-100 active:scale-95 transition-transform',
    danger: 'bg-rose-500 text-white shadow-xl shadow-rose-100 active:scale-95 transition-transform',
    outline: 'border-2 border-indigo-600 text-indigo-600 hover:bg-slate-50'
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-16 rounded-3xl flex flex-col items-center justify-center font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={18} />}
        <span className="text-sm tracking-wide uppercase">{children}</span>
      </div>
      {sublabel && <span className={`${variant === 'primary' ? 'text-indigo-200' : 'text-slate-400'} text-[10px] font-medium mt-0.5`}>{sublabel}</span>}
    </motion.button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-slate-50 rounded-[32px] p-2 border border-slate-100 shadow-sm ${className}`}>
    <div className="p-4">
      {children}
    </div>
  </div>
);

// --- App Layout ---

type Tab = 'attendance' | 'history' | 'profile' | 'performance';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setUser(u);
          let p = await getUserProfile(u.uid);
          if (!p) {
            p = {
              uid: u.uid,
              name: u.displayName || u.email?.split('@')[0] || 'User',
              email: u.email || '',
              role: 'employee',
              createdAt: new Date()
            };
            await createUserProfile(p);
          }
          setProfile(p);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth state error:", err);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Memuat...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView setMessage={setMessage} />
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans max-w-md mx-auto relative flex flex-col pb-20">
      {/* Header */}
      <header className="px-6 py-6 mt-4 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg">
            {profile?.name?.[0].toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Selamat Bekerja,</p>
            <h1 className="text-base font-extrabold text-slate-900 truncate max-w-[150px] leading-none">{profile?.name || user.email?.split('@')[0]}</h1>
          </div>
        </div>
        <button onClick={handleLogout} className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
          <LogOut size={18} />
        </button>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'attendance' ? (
            <motion.section 
              key="attendance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="flex items-center gap-2 mb-6 px-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Input Absensi</h2>
              </div>
              <AttendanceView 
                userId={user.uid} 
                setMessage={setMessage} 
                onSuccess={() => {
                  setRefreshHistory(prev => prev + 1);
                  setActiveTab('history');
                }} 
              />
            </motion.section>
          ) : activeTab === 'history' ? (
            <motion.section 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className="flex items-center gap-2 mb-6 px-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Laporan Absensi</h2>
              </div>
              <HistoryView userId={user.uid} refreshTrigger={refreshHistory} />
            </motion.section>
          ) : activeTab === 'performance' ? (
            <motion.section 
              key="performance"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
            >
              <div className="flex items-center gap-2 mb-6 px-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Performa Absensi</h2>
              </div>
              <PerformanceView userId={user.uid} refreshTrigger={refreshHistory} />
            </motion.section>
          ) : (
            <motion.section 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2 mb-6 px-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Profil Saya</h2>
              </div>
              <ProfileView user={user} profile={profile!} />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav - Redesigned for Simplicity (Icons Only) */}
      <div className="fixed bottom-6 left-6 right-6 z-50 flex justify-center pointer-events-none">
        <nav className="bg-slate-900/90 backdrop-blur-2xl p-2 rounded-[32px] flex items-center gap-2 shadow-2xl border border-white/10 pointer-events-auto">
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`relative p-3.5 rounded-[24px] transition-all duration-300 group ${
              activeTab === 'attendance' 
                ? 'bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Absensi"
          >
            <Navigation size={22} strokeWidth={activeTab === 'attendance' ? 3 : 2} className={activeTab === 'attendance' ? 'animate-pulse' : ''} />
            {activeTab === 'attendance' && (
              <motion.div 
                layoutId="nav-pill"
                className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"
              />
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={`relative p-3.5 rounded-[24px] transition-all duration-300 group ${
              activeTab === 'history' 
                ? 'bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Laporan"
          >
            <History size={22} strokeWidth={activeTab === 'history' ? 3 : 2} className={activeTab === 'history' ? 'rotate-12' : ''} />
            {activeTab === 'history' && (
              <motion.div 
                layoutId="nav-pill"
                className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"
              />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('performance')}
            className={`relative p-3.5 rounded-[24px] transition-all duration-300 group ${
              activeTab === 'performance' 
                ? 'bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Performa"
          >
            <Activity size={22} strokeWidth={activeTab === 'performance' ? 3 : 2} className={activeTab === 'performance' ? 'animate-bounce' : ''} />
            {activeTab === 'performance' && (
              <motion.div 
                layoutId="nav-pill"
                className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"
              />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('profile')}
            className={`relative p-3.5 rounded-[24px] transition-all duration-300 group ${
              activeTab === 'profile' 
                ? 'bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Profil"
          >
            <User size={22} strokeWidth={activeTab === 'profile' ? 3 : 2} />
            {activeTab === 'profile' && (
              <motion.div 
                layoutId="nav-pill"
                className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"
              />
            )}
          </button>
        </nav>
      </div>

      {/* Global Message Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-12 left-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 ${
              message.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-rose-500 text-white'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            <p className="font-bold text-xs uppercase tracking-wide">{message.text}</p>
            <button onClick={() => setMessage(null)} className="ml-auto opacity-70 hover:opacity-100 p-1 bg-white/20 rounded-lg">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 flex-1 ${
        active ? 'text-indigo-600 scale-110' : 'text-slate-300'
      }`}
    >
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[10px] font-bold uppercase tracking-tighter`}>{label}</span>
    </button>
  );
}

// --- View: Login ---

function LoginView({ setMessage }: { setMessage: any }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Internal user mapping
    const internalUsers: Record<string, string> = {
      'karyawan1': 'karyawan1@internal.com',
      'kurir1': 'kurir1@internal.com',
      'teknisi1': 'teknisi1@internal.com'
    };

    const email = internalUsers[username.toLowerCase()] || (username.includes('@') ? username : `${username}@internal.com`);

    try {
      // Try to sign in
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        // Handle both user-not-found and generic invalid-credential for silent auto-creation
        const isNewUserError = err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential';
        const isInternalAccount = !!internalUsers[username.toLowerCase()];
        
        if (isNewUserError && password === 'abc123' && isInternalAccount) {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Gagal login. Periksa kembali username/password.';
      if (err.code === 'auth/wrong-password') errorMsg = 'Password salah.';
      if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'Fitur Email/Password belum aktif di Firebase Console. Silakan aktifkan di menu Authentication > Sign-in method.';
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col justify-center p-8 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="relative z-10 space-y-8 max-w-sm mx-auto w-full">
        <div className="text-center relative">
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            className="w-24 h-24 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl rounded-[40px] flex items-center justify-center mx-auto mb-8 border border-white/30 shadow-2xl overflow-hidden group"
          >
            <ShieldCheck size={48} className="text-white relative z-10" strokeWidth={1.5} />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-6xl font-black text-white tracking-tighter mb-2 italic">
              ABSENSI
            </h1>
            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.5em] opacity-80 ml-2">
              Digital Workspace
            </p>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-4">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input 
                type="text" 
                placeholder="Ex: karyawan1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-3xl py-4 pl-12 pr-6 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-4">Password</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-3xl py-4 pl-12 pr-6 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-indigo-600 h-16 rounded-3xl font-black flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? 'DIPROSES...' : 'MASUK SEKARANG'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- View: Attendance ---

function AttendanceView({ userId, setMessage, onSuccess }: { userId: string, setMessage: any, onSuccess: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [category, setCategory] = useState<'Customer' | 'Others'>('Customer');
  const [attendanceType, setAttendanceType] = useState<'ABSENSI' | 'TERLAMBAT' | 'IZIN'>('ABSENSI');
  const [employeeType, setEmployeeType] = useState<'Employee' | 'Kurir' | 'Teknisi'>('Employee');
  const [reason, setReason] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Set default employee type based on logged in user and Auto-GPS
  useEffect(() => {
    const email = auth.currentUser?.email || '';
    if (email.startsWith('kurir1')) setEmployeeType('Kurir');
    else if (email.startsWith('teknisi1')) setEmployeeType('Teknisi');
    else if (email.startsWith('karyawan1')) setEmployeeType('Employee');

    // Auto-start GPS
    getLocation();

    // Constant GPS tracking (Optional, but user said "always active" so let's make it easy to re-get)
    const interval = setInterval(getLocation, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Updated Shifting Info
  const shiftingInfo = "Shift 09.00-18.00";

  const startCamera = async () => {
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Harap isi Keterangan / Reason terlebih dahulu.' });
      return;
    }
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Izin kamera ditolak.' });
      setIsCapturing(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const size = Math.min(videoRef.current.videoWidth, 400);
        canvasRef.current.width = size;
        canvasRef.current.height = size;
        context.drawImage(videoRef.current, 0, 0, size, size);
        const data = canvasRef.current.toDataURL('image/jpeg', 0.6);
        setPhoto(data);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCapturing(false);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation tidak didukung.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation(pos.coords),
      (err) => {
        console.error(err);
        setMessage({ type: 'error', text: 'Gagal deteksi GPS.' });
      }
    );
  };

  const handleSave = async () => {
    if (!photo) {
      setMessage({ type: 'error', text: 'Harap ambil foto selfie terlebih dahulu.' });
      return;
    }
    if (!location) {
      setMessage({ type: 'error', text: 'Harap tunggu lokasi GPS terdeteksi.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addAttendance({
        userId,
        category,
        attendanceType,
        employeeType,
        shifting: shiftingInfo,
        reason: reason.trim(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        photoBase64: photo
      });
      setMessage({ type: 'success', text: 'DATA BERHASIL DISIMPAN!' });
      setPhoto(null);
      setLocation(null);
      setReason('');
      onSuccess();
    } catch (error: any) {
      console.error("Submission error:", error);
      let errorMsg = 'Gagal menyimpan data.';
      try {
        const detail = JSON.parse(error.message);
        if (detail.error.includes('Insufficient permissions')) {
          errorMsg = 'Gagal: Izin ditolak. Periksa GPS & Kamera.';
        }
      } catch (e) {}
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <Card>
        {/* Shifting Info Display */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Informasi Shifting</p>
              <p className="text-xs font-black text-indigo-900">{shiftingInfo}</p>
            </div>
          </div>
          <CheckCircle2 size={20} className="text-indigo-600" />
        </div>

        {/* Form Inputs */}
        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipe Absensi</label>
            <div className="flex gap-2">
              {(['ABSENSI', 'TERLAMBAT', 'IZIN'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAttendanceType(type)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${
                    attendanceType === type 
                      ? type === 'TERLAMBAT' ? 'bg-rose-600 text-white shadow-lg shadow-rose-100 scale-[1.02]' 
                        : type === 'IZIN' ? 'bg-amber-600 text-white shadow-lg shadow-amber-100 scale-[1.02]'
                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]' 
                      : 'bg-slate-50 text-slate-400 border-2 border-transparent'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori Lokasi</label>
              <div className="relative">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-black text-slate-800 focus:border-indigo-600 outline-none transition-all pr-10"
                >
                  <option value="Customer">Customer</option>
                  <option value="Others">Others</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipe Karyawan</label>
              <div className="relative">
                <select 
                  value={employeeType}
                  onChange={(e) => setEmployeeType(e.target.value as any)}
                  className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-black text-slate-800 focus:border-indigo-600 outline-none transition-all pr-10"
                >
                  <option value="Employee">Employee</option>
                  <option value="Kurir">Kurir</option>
                  <option value="Teknisi">Teknisi</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Reason Field */}
        <div className="space-y-2 mb-6">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan / Reason</label>
          <textarea 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tuliskan alasan atau keterangan tambahan..."
            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:border-indigo-600 outline-none transition-all min-h-[80px] resize-none"
          />
        </div>

        {/* Camera Preview */}
        <div className="relative aspect-[4/5] bg-slate-800 rounded-[28px] overflow-hidden group shadow-inner mb-4">
          {isCapturing ? (
            <div className="relative w-full h-full">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
              <button 
                onClick={takePhoto}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all border-8 border-slate-200 z-30"
              >
                <div className="w-12 h-12 bg-indigo-600 rounded-full"></div>
              </button>
            </div>
          ) : photo ? (
            <>
              <img src={photo} alt="Selfie" className="w-full h-full object-cover" />
              <button onClick={() => setPhoto(null)} className="absolute top-4 right-4 bg-white/90 backdrop-blur text-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg z-30">Ulangi Foto</button>
            </>
          ) : (
            <button onClick={startCamera} className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-500 hover:text-white transition-colors bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 border-dashed rounded-[28px] m-2">
              <Camera size={48} strokeWidth={1} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50 px-8 text-center leading-relaxed">Ketuk untuk mengambil foto selfie verifikasi</span>
            </button>
          )}
          
          <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur p-3 rounded-2xl flex items-center space-x-3 shadow-2xl border border-white z-20">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${location ? 'bg-indigo-600 text-white shadow-indigo-100 shadow-lg' : 'bg-slate-100 text-slate-300'}`}>
              <MapPin size={20} />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Lokasi Terkini</p>
              {location ? (
                <p className="text-xs font-black text-indigo-900 truncate tracking-tight">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</p>
              ) : (
                <button onClick={getLocation} className="text-xs text-indigo-600 font-black uppercase tracking-tight flex items-center gap-1.5 ring-2 ring-indigo-50 px-2 py-0.5 rounded-lg w-fit mt-1">
                  <Navigation size={12} className="rotate-45" /> AKTIFKAN GPS
                </button>
              )}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <Button 
          disabled={isSubmitting}
          onClick={handleSave} 
          className="w-full py-6 mt-4 rounded-[28px] text-lg tracking-[0.1em]"
          icon={Save}
        >
          SAVE
        </Button>
      </Card>
      
      <style>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </motion.div>
  );
}

// --- View: History ---

function HistoryView({ userId, refreshTrigger }: { userId: string, refreshTrigger: number }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string, link?: string } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAttendanceHistory(userId);
        setRecords(data || []);
      } catch (err: any) {
        console.error("History fetch error:", err);
        let msg = "Gagal memuat data. Cek koneksi Anda.";
        let link;
        
        // Check for Firestore Index creation link
        if (err.message.includes("https://console.firebase.google.com")) {
          msg = "Indeks Database Sedang Disiapkan. Klik link di bawah untuk mengaktifkan.";
          const match = err.message.match(/https:\/\/console\.firebase\.google\.com[^\s)]+/);
          if (match) link = match[0];
        } else if (err.message.includes("permission-denied")) {
          msg = "Akses ditolak. Silakan login ulang.";
        }
        
        setError({ message: msg, link });
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [userId, refreshTrigger, localRefresh]);

  const renderTime = (record: AttendanceRecord) => {
    if (!record.timestamp) return "Baru saja";
    try {
      // Handle both Firestore Timestamp and potential Date fallback
      const date = typeof record.timestamp.toDate === 'function' ? record.timestamp.toDate() : new Date(record.timestamp as any);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "--:--";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4 pb-20"
    >
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">Laporan Harian</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setLocalRefresh(prev => prev + 1)}
            className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <History size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm border border-indigo-100">
            {records.length} Record
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-50 rounded-[32px] animate-pulse"></div>)}
        </div>
      ) : error ? (
        <div className="py-12 px-6 text-center bg-slate-50 rounded-[40px] border border-slate-100">
           <AlertTriangle className="mx-auto text-indigo-500 mb-4" size={40} />
           <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Konfigurasi Database</p>
           <p className="text-[11px] text-slate-500 font-bold mb-6 italic leading-relaxed">{error.message}</p>
           {error.link ? (
             <a href={error.link} target="_blank" rel="noreferrer" className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Aktifkan Indeks Sekarang</a>
           ) : (
             <button onClick={() => setLocalRefresh(prev => prev + 1)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Coba Muat Ulang</button>
           )}
        </div>
      ) : records.length > 0 ? (
        <div className="space-y-4">
          {records.map((record) => (
            <Card key={record.id} className="p-0 overflow-hidden border-slate-100/50 shadow-sm">
              <div className="p-5 flex gap-4">
                <div 
                  className="w-20 h-24 rounded-2xl bg-slate-100 shrink-0 overflow-hidden relative group cursor-pointer"
                  onClick={() => setSelectedRecord(record)}
                >
                  <img src={record.photoBase64} className="w-full h-full object-cover" alt="Selfie" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 size={14} className="text-white" />
                  </div>
                  {/* Status Dot */}
                  <div className={`absolute top-2 left-2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                    record.attendanceType === 'TERLAMBAT' ? 'bg-rose-500' :
                    record.attendanceType === 'IZIN' ? 'bg-amber-500' :
                    'bg-indigo-500'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex gap-1.5">
                      <div className={`px-2 py-0.5 rounded-lg ${
                        record.attendanceType === 'TERLAMBAT' ? 'bg-rose-50 text-rose-600' :
                        record.attendanceType === 'IZIN' ? 'bg-amber-50 text-amber-600' :
                        'bg-indigo-50 text-indigo-600'
                      }`}>
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                          {record.attendanceType || 'ABSENSI'}
                        </p>
                      </div>
                      <div className="px-2 py-0.5 bg-slate-50 rounded-lg">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{record.employeeType}</p>
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{renderTime(record)}</p>
                  </div>
                  
                  <h3 className="text-sm font-black text-slate-900 mb-1 truncate">{record.category}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mb-1">{record.shifting}</p>
                  
                  {record.reason && (
                    <p className="text-[10px] text-slate-500 font-medium italic mb-2 line-clamp-1">
                      "{record.reason}"
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-50 mt-1">
                    <button 
                      onClick={() => setSelectedRecord(record)}
                      className="flex items-center gap-1.5 text-[9px] font-black text-indigo-600 bg-indigo-50/50 px-2 py-1.5 rounded-lg"
                    >
                      <Eye size={10} /> DETAIL
                    </button>
                    <a 
                      href={`https://www.google.com/maps?q=${record.location.latitude},${record.location.longitude}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-1.5 rounded-lg"
                    >
                      <MapPin size={10} /> MAPS
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[40px]">
          <div className="w-20 h-20 bg-white shadow-sm border border-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <History size={32} className="text-slate-200" strokeWidth={1.5} />
          </div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Daftar Kosong</h4>
          <p className="text-[10px] font-bold text-slate-400 px-12 leading-relaxed">Anda belum melakukan absensi. Mulai absen sekarang!</p>
          <button 
            onClick={() => {
              // Access current activeTab via props or logic. Here we just guide.
             const el = document.querySelector('[data-tab-absen]') as HTMLButtonElement;
             if(el) el.click();
            }}
            className="mt-6 text-indigo-600 text-[10px] font-black uppercase tracking-widest border-b-2 border-indigo-200 pb-1"
          >
            Kembali ke Form Absen
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Image Header */}
              <div className="h-64 relative">
                <img src={selectedRecord.photoBase64} className="w-full h-full object-cover" alt="Full Record" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="absolute top-6 right-6 w-12 h-12 bg-slate-900 text-white rounded-[18px] flex items-center justify-center shadow-2xl z-50 hover:bg-black transition-all active:scale-90 border-2 border-white/20"
                >
                  <X size={24} strokeWidth={3} />
                </button>
                <div className="absolute bottom-6 left-6 text-white">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Bukti Selfie</p>
                   <h4 className="text-xl font-black">{selectedRecord.employeeType}</h4>
                </div>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                    <div className={`px-3 py-1 rounded-xl w-fit ${
                      selectedRecord.attendanceType === 'TERLAMBAT' ? 'bg-rose-50 text-rose-600' : 
                      selectedRecord.attendanceType === 'IZIN' ? 'bg-amber-50 text-amber-600' : 
                      'bg-indigo-50 text-indigo-600'
                    }`}>
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        {selectedRecord.attendanceType || 'ABSENSI'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</p>
                    <p className="text-xs font-black text-slate-900">{selectedRecord.timestamp?.toDate().toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shifting</p>
                    <p className="text-xs font-black text-slate-900">{selectedRecord.shifting}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lokasi</p>
                    <p className="text-xs font-black text-slate-900">{selectedRecord.category}</p>
                  </div>
                </div>

                {selectedRecord.reason && (
                  <div className="space-y-1 pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan / Reason</p>
                    <p className="text-xs font-bold text-slate-600 italic leading-relaxed">"{selectedRecord.reason}"</p>
                  </div>
                )}

                <div className="pt-8 group">
                  <a 
                    href={`https://www.google.com/maps?q=${selectedRecord.location.latitude},${selectedRecord.location.longitude}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full h-14 bg-slate-900 text-white rounded-[24px] flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                  >
                    <MapPin size={18} /> Buka Lokasi di Maps
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- View: Profile ---

function ProfileView({ user, profile }: { user: FirebaseUser, profile: UserProfile }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center py-8">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-[32px] bg-indigo-600 flex items-center justify-center p-1 shadow-2xl">
            <div className="w-full h-full rounded-[28px] bg-white flex items-center justify-center text-indigo-600 font-black text-3xl">
              {profile.name[0].toUpperCase()}
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl border-4 border-white shadow-lg">
            <ShieldCheck size={16} />
          </div>
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-6">{profile.name}</h3>
        <p className="text-indigo-600 font-bold uppercase text-[10px] tracking-[0.4em] mt-2 opacity-60">Professional Staff</p>
      </div>

      <div className="space-y-3">
        <ProfileInfo icon={CircleUser} label="Identitas User" value={user.email} />
        <ProfileInfo icon={Briefcase} label="Akses Akun" value={profile.role.toUpperCase()} />
        <ProfileInfo icon={Clock} label="Bergabung Sejak" value={profile.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString() : 'Baru'} />
      </div>
    </motion.div>
  );
}

function ProfileInfo({ icon: Icon, label, value }: any) {
  return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-[32px] flex items-center gap-4">
      <div className="w-11 h-11 bg-white text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-xs font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

// --- View: Performance ---

function PerformanceView({ userId, refreshTrigger }: { userId: string, refreshTrigger: number }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const records = await getAttendanceHistory(userId, 100);
        
        const counts = {
          ABSENSI: 0,
          TERLAMBAT: 0,
          IZIN: 0
        };

        records.forEach(r => {
          const type = r.attendanceType || 'ABSENSI';
          if (counts.hasOwnProperty(type)) {
            counts[type as keyof typeof counts]++;
          }
        });

        const chartData = [
          { name: 'Normal', value: counts.ABSENSI, color: '#4F46E5' },
          { name: 'Terlambat', value: counts.TERLAMBAT, color: '#F43F5E' },
          { name: 'Izin', value: counts.IZIN, color: '#F59E0B' }
        ];

        setStats({ counts, chartData, total: records.length });
      } catch (err) {
        console.error("Stats error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [userId, refreshTrigger]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-slate-50 rounded-3xl animate-pulse"></div>
          <div className="h-24 bg-slate-50 rounded-3xl animate-pulse"></div>
        </div>
        <div className="h-64 bg-slate-50 rounded-[40px] animate-pulse"></div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="py-24 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[40px]">
        <div className="w-20 h-20 bg-white shadow-sm border border-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Activity size={32} className="text-slate-200" strokeWidth={1.5} />
        </div>
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Belum Ada Data</h4>
        <p className="text-[10px] font-bold text-slate-400 px-12 leading-relaxed">Lakukan absensi untuk melihat grafik performa Anda.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-20"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 bg-rose-50 border border-rose-100 rounded-[32px] relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Total Terlambat</p>
            <h4 className="text-3xl font-black text-rose-600">{stats.counts.TERLAMBAT}</h4>
          </div>
          <div className="absolute -bottom-4 -right-4 text-rose-100/50 group-hover:scale-110 transition-transform">
             <AlertTriangle size={80} strokeWidth={3} />
          </div>
        </div>

        <div className="p-5 bg-amber-50 border border-amber-100 rounded-[32px] relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Total Izin</p>
            <h4 className="text-3xl font-black text-amber-600">{stats.counts.IZIN}</h4>
          </div>
          <div className="absolute -bottom-4 -right-4 text-amber-100/50 group-hover:scale-110 transition-transform">
             <Clock size={80} strokeWidth={3} />
          </div>
        </div>
      </div>

      <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-[32px] flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Record</p>
          <h4 className="text-2xl font-black text-indigo-600">{stats.total} <span className="text-xs font-bold text-indigo-300 ml-1 tracking-normal italic">kunjungan</span></h4>
        </div>
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
           <TrendingUp size={24} />
        </div>
      </div>

      {/* Charts Section */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-600" /> Breakdown Kehadiran
          </h3>
        </div>
        <div className="p-6 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }}
              />
              <Tooltip 
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  padding: '12px'
                }}
                labelStyle={{ fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', color: '#64748B' }}
                itemStyle={{ fontWeight: 900, fontSize: '12px', color: '#1E293B' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                {stats.chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Performance Score */}
      <div className="p-8 bg-slate-900 rounded-[40px] text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity size={120} className="text-white" />
        </div>
        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Attendance Performance Score</h5>
        <div className="relative inline-block border-4 border-white/10 p-2 rounded-full mb-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg">
            {Math.round((stats.counts.ABSENSI / stats.total) * 100)}%
          </div>
        </div>
        <p className="text-xs text-white/60 font-bold max-w-[200px] mx-auto leading-relaxed italic">
          "{stats.counts.TERLAMBAT > 2 ? 'Tolong kurangi keterlambatan Anda' : 'Kerja bagus! Pertahankan kedisiplinan Anda'}"
        </p>
      </div>
    </motion.div>
  );
}
