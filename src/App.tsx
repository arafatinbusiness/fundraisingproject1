import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { User, Funding, Log, FundInfo } from './types';
import { Loader2, AlertCircle, ShieldCheck, LayoutDashboard } from 'lucide-react';

// Error Boundary Component
const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');

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
        
        // Try to get user role from DB
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setIsAdmin(userDoc.data().role === 'admin' || isAdminEmail);
          } else {
            setIsAdmin(isAdminEmail);
          }
        } catch (err) {
          setIsAdmin(isAdminEmail);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Listen to Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });

    // Listen to Fundings
    const unsubFundings = onSnapshot(query(collection(db, 'fundings'), orderBy('year', 'desc'), orderBy('month', 'desc')), (snapshot) => {
      setFundings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Funding)));
    });

    // Listen to Logs
    const unsubLogs = onSnapshot(query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log)));
    });

    // Listen to Fund Info
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
  }, [isAuthReady, user]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <Layout user={null} isAdmin={false}>
        <Auth />
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout user={user} isAdmin={isAdmin}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
          <p className="text-slate-500">তথ্য লোড হচ্ছে...</p>
        </div>
      </Layout>
    );
  }

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
          />
        ) : (
          <AdminPanel 
            users={users} 
            fundings={fundings} 
            fundInfo={fundInfo} 
            currentAdmin={user} 
          />
        )}
      </div>
    </Layout>
  );
};

export default App;
