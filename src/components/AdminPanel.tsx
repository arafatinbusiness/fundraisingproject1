import React, { useState } from 'react';
import { UserPlus, DollarSign, Settings, Save, X, Plus, Trash2, Users, ChevronRight, Info } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { User, Funding, FundInfo } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  users: User[];
  fundings: Funding[];
  fundInfo: FundInfo | null;
  currentAdmin: any;
}

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const AdminPanel: React.FC<AdminPanelProps> = ({ users, fundings, fundInfo, currentAdmin }) => {
  const [activeTab, setActiveTab] = useState<'funding' | 'users' | 'info'>('funding');
  
  // Funding State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(MONTHS_BN[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);

  // User State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');
  const [userDetails, setUserDetails] = useState('');

  // Fund Info State
  const [fundName, setFundName] = useState(fundInfo?.name || '');
  const [fundDesc, setFundDesc] = useState(fundInfo?.description || '');

  const logAction = async (type: string, details: string) => {
    await addDoc(collection(db, 'logs'), {
      type,
      details,
      timestamp: new Date().toISOString(),
      adminId: currentAdmin.uid,
      adminName: currentAdmin.displayName || 'অ্যাডমিন'
    });
  };

  const handleUpdateFunding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !amount || !month || !year) return;

    setLoading(true);
    try {
      const user = users.find(u => u.id === selectedUserId);
      const q = query(
        collection(db, 'fundings'),
        where('userId', '==', selectedUserId),
        where('month', '==', month),
        where('year', '==', parseInt(year))
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'fundings', existingDoc.id), {
          amount: parseFloat(amount),
          updatedAt: new Date().toISOString(),
          updatedBy: currentAdmin.displayName || 'অ্যাডমিন'
        });
        await logAction('funding_update', `${user?.name}-এর ${month} ${year}-এর তহবিল আপডেট করা হয়েছে: ${amount} টাকা`);
      } else {
        await addDoc(collection(db, 'fundings'), {
          userId: selectedUserId,
          userName: user?.name || 'অজানা',
          amount: parseFloat(amount),
          month,
          year: parseInt(year),
          updatedAt: new Date().toISOString(),
          updatedBy: currentAdmin.displayName || 'অ্যাডমিন'
        });
        await logAction('funding_update', `${user?.name}-এর ${month} ${year}-এর নতুন তহবিল যোগ করা হয়েছে: ${amount} টাকা`);
      }
      setAmount('');
      alert('তহবিল সফলভাবে আপডেট হয়েছে!');
    } catch (err) {
      console.error(err);
      alert('কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'users'), {
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        details: userDetails,
        uid: '' 
      });
      await logAction('user_add', `নতুন সদস্য যোগ করা হয়েছে: ${newUserName} (${newUserRole})`);
      setNewUserName('');
      setNewUserEmail('');
      setUserDetails('');
      alert('সদস্য সফলভাবে যোগ করা হয়েছে!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFundInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (fundInfo?.id) {
        await updateDoc(doc(db, 'fund_info', fundInfo.id), {
          name: fundName,
          description: fundDesc
        });
      } else {
        await addDoc(collection(db, 'fund_info'), {
          name: fundName,
          description: fundDesc,
          year: new Date().getFullYear()
        });
      }
      alert('তহবিলের তথ্য আপডেট হয়েছে!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('funding')}
          className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'funding' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <DollarSign size={16} />
          তহবিল
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'users' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Users size={16} />
          সদস্য
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'info' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Settings size={16} />
          সেটিংস
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'funding' && (
          <motion.div
            key="funding"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
          >
            <form onSubmit={handleUpdateFunding} className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <DollarSign size={18} />
                </div>
                <h3 className="text-lg font-black text-slate-800">তহবিল আপডেট করুন</h3>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">সদস্য নির্বাচন করুন</label>
                <select
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">সদস্য বেছে নিন</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">মাস</label>
                  <select
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    required
                  >
                    {MONTHS_BN.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">বছর</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">পরিমাণ (টাকা)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    placeholder="৫০০"
                    className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'আপডেট হচ্ছে...' : 'তহবিল আপডেট করুন'}
              </button>
            </form>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <form onSubmit={handleAddUser} className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <UserPlus size={18} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">নতুন সদস্য যোগ করুন</h3>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">নাম (বাংলায়)</label>
                  <input
                    type="text"
                    placeholder="উদা: আব্দুল করিম"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">ইমেইল</label>
                  <input
                    type="email"
                    placeholder="karim@example.com"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">রোল</label>
                  <select
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'member')}
                  >
                    <option value="member">সদস্য</option>
                    <option value="admin">অ্যাডমিন</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'যোগ হচ্ছে...' : 'সদস্য যোগ করুন'}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black text-slate-800">বর্তমান সদস্য তালিকা</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{users.length.toLocaleString('bn-BD')} জন</span>
              </div>
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 leading-tight">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] uppercase font-black px-2 py-1 rounded-lg ${
                      u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {u.role === 'admin' ? 'অ্যাডমিন' : 'সদস্য'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
          >
            <form onSubmit={handleUpdateFundInfo} className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                  <Settings size={18} />
                </div>
                <h3 className="text-lg font-black text-slate-800">তহবিলের সাধারণ তথ্য</h3>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">তহবিলের নাম</label>
                <input
                  type="text"
                  placeholder="উদা: গরুর মাংস তহবিল ২০২৬"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-sm"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">বিস্তারিত বর্ণনা</label>
                <textarea
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-sm"
                  rows={4}
                  value={fundDesc}
                  onChange={(e) => setFundDesc(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'সংরক্ষণ হচ্ছে...' : 'তথ্য সংরক্ষণ করুন'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
