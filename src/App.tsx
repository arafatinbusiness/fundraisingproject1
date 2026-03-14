import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { LandingPage } from './components/LandingPage';
import { User, Funding, Log, FundInfo } from './types';
import { Loader2, AlertCircle, ShieldCheck, LayoutDashboard } from 'lucide-react';

// Error Boundary Component
const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');
  const [showLanding, setShowLanding] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [fundings, setFundings] = useState<Funding[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [fundInfo, setFundInfo] = useState<FundInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);

      if (firebaseUser) {
        // Check if first admin or has admin role in DB
        const isAdminEmail = firebaseUser.email === 'arafatinbusiness@gmail.com';
        
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            // User document exists, check admin role
            setIsAdmin(userDoc.data().role === 'admin' || isAdminEmail);
          } else {
            // User document doesn't exist - create it automatically
            setIsAdmin(isAdminEmail);
            
            // Auto-create user document on first login
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                email: firebaseUser.email || '',
                role: isAdminEmail ? 'admin' : 'member',
                details: '',
                createdAt: new Date().toISOString()
              });
              console.log('Auto-created user document for:', firebaseUser.email);
            } catch (createErr) {
              console.error('Error auto-creating user document:', createErr);
            }
          }
        } catch (err) {
          console.error('Error checking user document:', err);
          setIsAdmin(isAdminEmail);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Listen to Users (public data)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });

    // Listen to Fundings (public data)
    const unsubFundings = onSnapshot(query(collection(db, 'fundings'), orderBy('year', 'desc'), orderBy('month', 'desc')), (snapshot) => {
      setFundings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Funding)));
    });

    // Listen to Logs (public data)
    const unsubLogs = onSnapshot(query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log)));
    });

    // Listen to Fund Info (public data)
    const unsubInfo = onSnapshot(collection(db, 'fund_info'), (snapshot) => {
      if (!snapshot.empty) {
        setFundInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FundInfo);
      }
    });

    setLoading(false);

    return () => {
      unsubUsers();
      unsubFundings();
      unsubLogs();
      unsubInfo();
    };
  }, [isAuthReady]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  // Show loading state while fetching data
  if (loading) {
    return (
      <Layout user={user} isAdmin={isAdmin} currentView={view} onViewChange={setView}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
          <p className="text-slate-500">তথ্য লোড হচ্ছে...</p>
        </div>
      </Layout>
    );
  }

  // Show landing page first if user is not logged in
  if (showLanding && !user) {
    return <LandingPage onLogin={() => setShowLanding(false)} />;
  }

  // Always show content (public read-only access)
  // If user is logged in and is admin, show admin features
  return (
    <Layout 
      user={user} 
      isAdmin={isAdmin} 
      currentView={view} 
      onViewChange={setView}
    >
      <div className="pb-20 sm:pb-0">
        {view === 'dashboard' ? (
          <Dashboard 
            fundings={fundings} 
            logs={logs} 
            users={users} 
            fundName={fundInfo?.name || ''} 
            isAdmin={isAdmin}
          />
        ) : (
          // Only show AdminPanel if user is logged in and is admin
          isAdmin ? (
            <AdminPanel 
              users={users} 
              fundings={fundings} 
              fundInfo={fundInfo} 
              currentAdmin={user} 
            />
          ) : (
            // If non-admin tries to access admin panel, show message
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShieldCheck className="text-slate-300 mb-4" size={48} />
              <h3 className="text-xl font-bold text-slate-700 mb-2">অ্যাডমিন এক্সেস প্রয়োজন</h3>
              <p className="text-slate-500 max-w-md">
                এই প্যানেল শুধুমাত্র অ্যাডমিন ব্যবহারকারীদের জন্য। অ্যাডমিন এক্সেস পেতে লগইন করুন।
              </p>
            </div>
          )
        )}
      </div>
    </Layout>
  );
};

export default App;
