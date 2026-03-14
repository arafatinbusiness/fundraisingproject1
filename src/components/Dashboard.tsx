import React, { useState, useMemo } from 'react';
import { Download, Filter, Search, Calendar, User as UserIcon, History, TrendingUp, Users, Wallet } from 'lucide-react';
import { Funding, Log, User } from '../types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  fundings: Funding[];
  logs: Log[];
  users: User[];
  fundName: string;
}

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const Dashboard: React.FC<DashboardProps> = ({ fundings, logs, users, fundName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const years = useMemo(() => {
    const yrs = new Set(fundings.map(f => f.year.toString()));
    return (Array.from(yrs) as string[]).sort((a, b) => b.localeCompare(a));
  }, [fundings]);

  const filteredFundings = useMemo(() => {
    return fundings.filter(f => {
      const matchesSearch = f.userName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = selectedMonth ? f.month === selectedMonth : true;
      const matchesYear = selectedYear ? f.year.toString() === selectedYear : true;
      return matchesSearch && matchesMonth && matchesYear;
    });
  }, [fundings, searchTerm, selectedMonth, selectedYear]);

  const totalAmount = useMemo(() => fundings.reduce((sum, f) => sum + f.amount, 0), [fundings]);
  const currentMonthAmount = useMemo(() => {
    const now = new Date();
    const currentMonth = MONTHS_BN[now.getMonth()];
    const currentYear = now.getFullYear();
    return fundings
      .filter(f => f.month === currentMonth && f.year === currentYear)
      .reduce((sum, f) => sum + f.amount, 0);
  }, [fundings]);

  const exportToExcel = () => {
    const data = filteredFundings.map(f => ({
      'সদস্যের নাম': f.userName,
      'মাস': f.month,
      'বছর': f.year,
      'পরিমাণ (টাকা)': f.amount,
      'আপডেট হয়েছে': format(new Date(f.updatedAt), 'dd MMM yyyy, hh:mm a', { locale: bn })
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funding Report');
    XLSX.writeFile(wb, `Funding_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-600 rounded-[2rem] p-7 text-white shadow-2xl shadow-emerald-100 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Wallet size={16} />
              </div>
              <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest">মোট সংগ্রহ</p>
            </div>
            <h3 className="text-4xl font-black tracking-tight">{totalAmount.toLocaleString('bn-BD')} ৳</h3>
            <div className="mt-4 flex items-center gap-2">
              <div className="px-2 py-0.5 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-tighter backdrop-blur-sm">
                {fundName || 'তহবিল ড্যাশবোর্ড'}
              </div>
            </div>
          </div>
          <Wallet className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10 rotate-12" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">এই মাসের জমা</p>
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{currentMonthAmount.toLocaleString('bn-BD')} ৳</h3>
            <div className="mt-4 flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase tracking-tighter">
              <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
              <span>চলতি মাস আপডেট</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Users size={16} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">মোট সদস্য</p>
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{users.length.toLocaleString('bn-BD')} জন</h3>
            <div className="mt-4 flex items-center gap-1.5 text-blue-600 text-[10px] font-black uppercase tracking-tighter">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              <span>সক্রিয় সদস্য তালিকা</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="সদস্যের নাম খুঁজুন..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-4 rounded-2xl border transition-all shadow-sm active:scale-95 ${
              showFilters ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <Filter size={20} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-3 p-5 bg-slate-100 rounded-3xl border border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">মাস</label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-black"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    <option value="">সকল মাস</option>
                    {MONTHS_BN.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">বছর</label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-black"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    <option value="">সকল বছর</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-sm border uppercase tracking-widest ${
              showLogs ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <History size={16} />
            {showLogs ? 'তালিকায় ফিরুন' : 'ইতিহাস দেখুন'}
          </button>
          <button
            onClick={exportToExcel}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 uppercase tracking-widest"
          >
            <Download size={16} />
            এক্সেল রিপোর্ট
          </button>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {showLogs ? (
          <motion.div
            key="logs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-black text-slate-800 px-1 flex items-center gap-2">
              <History size={16} className="text-emerald-600" />
              অ্যাডমিন পরিবর্তনের ইতিহাস
            </h3>
            <div className="space-y-3">
              {logs.length > 0 ? logs.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${
                      log.type === 'funding_update' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {log.type === 'funding_update' ? 'তহবিল আপডেট' : 'সদস্য যোগ'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {format(new Date(log.timestamp), 'dd MMM, hh:mm a', { locale: bn })}
                    </span>
                  </div>
                  <p className="text-slate-700 text-sm font-medium leading-relaxed">{log.details}</p>
                  <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
                    <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {log.adminName.charAt(0)}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">অ্যাডমিন: {log.adminName}</p>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-slate-400 font-medium italic">কোনো ইতিহাস পাওয়া যায়নি।</div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-slate-800">তহবিল সংগ্রহের তালিকা</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{filteredFundings.length.toLocaleString('bn-BD')} টি রেকর্ড</span>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">সদস্যের নাম</th>
                    <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">মাস ও বছর</th>
                    <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">পরিমাণ</th>
                    <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">শেষ আপডেট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFundings.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                            {f.userName.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900">{f.userName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{f.month}, {f.year}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-black text-emerald-600 text-lg">{f.amount.toLocaleString('bn-BD')} ৳</span>
                      </td>
                      <td className="p-4 text-xs text-slate-400 font-medium">
                        {format(new Date(f.updatedAt), 'dd MMM yyyy', { locale: bn })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {filteredFundings.length > 0 ? filteredFundings.map(f => (
                <motion.div 
                  layout
                  key={f.id} 
                  className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner">
                      {f.userName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 leading-tight">{f.userName}</h4>
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold mt-1">
                        <Calendar size={10} />
                        <span>{f.month}, {f.year}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-emerald-600 leading-none">{f.amount.toLocaleString('bn-BD')} ৳</p>
                    <p className="text-[9px] text-slate-300 font-bold uppercase mt-1">
                      {format(new Date(f.updatedAt), 'dd MMM yyyy', { locale: bn })}
                    </p>
                  </div>
                </motion.div>
              )) : (
                <div className="py-20 text-center text-slate-400 font-medium italic">কোনো তথ্য পাওয়া যায়নি।</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
