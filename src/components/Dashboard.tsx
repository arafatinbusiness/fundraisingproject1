import React, { useState, useMemo, useCallback } from 'react';
import { Download, Filter, Search, Calendar, User as UserIcon, History, TrendingUp, Users, Wallet, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Funding, Log, User } from '../types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

interface DashboardProps {
  fundings: Funding[];
  logs: Log[];
  users: User[];
  fundName: string;
  isAdmin?: boolean;
}

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const Dashboard: React.FC<DashboardProps> = ({ fundings, logs, users, fundName, isAdmin }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('summary'); // Default to summary view
  const LOGS_PER_PAGE = 10;

  // Reset logs page when switching to logs view
  const toggleLogsView = useCallback(() => {
    setShowLogs(prev => {
      if (!prev) {
        setLogsPage(1); // Reset to first page when showing logs
      }
      return !prev;
    });
  }, []);

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

  // Calculate total amount per member
  const memberTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    fundings.forEach(f => {
      if (!totals[f.userName]) {
        totals[f.userName] = 0;
      }
      totals[f.userName] += f.amount;
    });
    return totals;
  }, [fundings]);

  // Get unique months and years for Excel columns
  const allMonthsYears = useMemo(() => {
    const uniqueCombos = new Set<string>();
    fundings.forEach(f => {
      uniqueCombos.add(`${f.month} ${f.year}`);
    });
    return Array.from(uniqueCombos).sort();
  }, [fundings]);

  // Filter months/years based on selected filters for summary view
  const filteredMonthsYears = useMemo(() => {
    return allMonthsYears.filter(monthYear => {
      const [month, year] = monthYear.split(' ');
      const matchesMonth = selectedMonth ? month === selectedMonth : true;
      const matchesYear = selectedYear ? year === selectedYear : true;
      return matchesMonth && matchesYear;
    });
  }, [allMonthsYears, selectedMonth, selectedYear]);

  // Create member contribution matrix for summary view
  const memberContributionMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    
    // Initialize all users
    users.forEach(user => {
      matrix[user.name] = {};
      allMonthsYears.forEach(monthYear => {
        matrix[user.name][monthYear] = 0;
      });
    });

    // Fill in actual amounts
    fundings.forEach(f => {
      const monthYear = `${f.month} ${f.year}`;
      if (matrix[f.userName]) {
        matrix[f.userName][monthYear] = f.amount;
      }
    });

    return matrix;
  }, [fundings, users, allMonthsYears]);

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    return users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [users, searchTerm]);

  // Calculate month totals
  const monthTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    allMonthsYears.forEach(monthYear => {
      totals[monthYear] = users.reduce((sum, user) => {
        return sum + (memberContributionMatrix[user.name]?.[monthYear] || 0);
      }, 0);
    });
    return totals;
  }, [allMonthsYears, users, memberContributionMatrix]);

  // Calculate member totals
  const memberTotalsWithMatrix = useMemo(() => {
    const totals: Record<string, number> = {};
    users.forEach(user => {
      totals[user.name] = Object.values(memberContributionMatrix[user.name] || {}).reduce((sum, amount) => sum + amount, 0);
    });
    return totals;
  }, [users, memberContributionMatrix]);

  // Paginated logs - memoized for performance
  const totalLogsPages = Math.ceil(logs.length / LOGS_PER_PAGE);
  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * LOGS_PER_PAGE;
    return logs.slice(start, start + LOGS_PER_PAGE);
  }, [logs, logsPage, LOGS_PER_PAGE]);

  const exportToExcel = () => {
    // Create member-based data structure
    const memberData: Record<string, Record<string, number>> = {};
    
    // Initialize all members with 0 for all months
    users.forEach(user => {
      memberData[user.name] = {};
      allMonthsYears.forEach(monthYear => {
        memberData[user.name][monthYear] = 0;
      });
    });

    // Fill in actual amounts
    fundings.forEach(f => {
      const monthYear = `${f.month} ${f.year}`;
      if (memberData[f.userName]) {
        memberData[f.userName][monthYear] = f.amount;
      }
    });

    // Convert to Excel rows
    const data = users.map(user => {
      const row: any = {
        'Member Name': user.name,
        'Phone': user.phone || user.email || '',
        'Role': user.role || 'member'
      };

      // Add month columns
      allMonthsYears.forEach(monthYear => {
        row[monthYear] = memberData[user.name]?.[monthYear] || 0;
      });

      // Calculate total for this member
      const memberTotal = Object.values(memberData[user.name] || {}).reduce((sum: number, amount: any) => sum + (Number(amount) || 0), 0);
      row['Total Amount'] = memberTotal;

      return row;
    });

    // Add total row
    const totalRow: any = {
      'Member Name': 'TOTAL',
      'Phone': '',
      'Role': ''
    };

    // Calculate totals for each month
    allMonthsYears.forEach(monthYear => {
      const monthTotal = users.reduce((sum, user) => sum + (memberData[user.name]?.[monthYear] || 0), 0);
      totalRow[monthYear] = monthTotal;
    });

    // Grand total
    const grandTotal = users.reduce((sum, user) => {
      const memberTotal = Object.values(memberData[user.name] || {}).reduce((sum: number, amount: any) => sum + (Number(amount) || 0), 0);
      return sum + memberTotal;
    }, 0);
    totalRow['Total Amount'] = grandTotal;

    // Add total row to data
    data.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Member Funding Report');
    XLSX.writeFile(wb, `Member_Funding_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Function to delete a log entry
  const handleDeleteLog = async (logId: string, logDetails: string) => {
    if (!isAdmin) {
      alert('শুধুমাত্র অ্যাডমিনরা ইতিহাস মুছতে পারেন।');
      return;
    }

    if (!confirm(`আপনি কি নিশ্চিত যে এই ইতিহাস মুছতে চান?\n\n"${logDetails}"\n\nএই কাজটি ফিরিয়ে আনা যাবে না।`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'logs', logId));
      alert('ইতিহাস সফলভাবে মুছে ফেলা হয়েছে!');
    } catch (err) {
      console.error('Error deleting log:', err);
      alert('ইতিহাস মুছতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6 pb-12">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                <UserIcon size={16} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">সর্বোচ্চ জমাকারী</p>
            </div>
            {Object.keys(memberTotals).length > 0 ? (
              <>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  {Object.entries(memberTotals).sort((a, b) => b[1] - a[1])[0]?.[0]}
                </h3>
                <div className="mt-2 flex items-center gap-1.5 text-purple-600 text-[10px] font-black uppercase tracking-tighter">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                  <span>{Object.entries(memberTotals).sort((a, b) => b[1] - a[1])[0]?.[1].toLocaleString('bn-BD')} ৳</span>
                </div>
              </>
            ) : (
              <h3 className="text-2xl font-black text-slate-400 tracking-tight">কোনো তথ্য নেই</h3>
            )}
          </div>
        </motion.div>
      </div>

      {/* Month Selector */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Calendar size={16} className="text-emerald-600" />
            মাস সিলেক্ট করুন
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {selectedMonth && selectedYear 
              ? `${selectedMonth} ${selectedYear} নির্বাচিত`
              : selectedMonth 
                ? `${selectedMonth} নির্বাচিত`
                : selectedYear
                  ? `${selectedYear} নির্বাচিত`
                  : 'সকল মাস দেখানো হচ্ছে'
            }
          </span>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MONTHS_BN.map(month => (
            <button
              key={month}
              onClick={() => {
                setSelectedMonth(selectedMonth === month ? '' : month);
                setViewMode('summary'); // Switch to summary view when selecting month
              }}
              className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                selectedMonth === month
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {month}
            </button>
          ))}
        </div>
        
        {/* Year Selector */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-600">বছর:</span>
            <div className="flex flex-wrap gap-1">
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(selectedYear === year ? '' : year)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedYear === year
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          
          {/* Clear Filters */}
          {(selectedMonth || selectedYear) && (
            <button
              onClick={() => {
                setSelectedMonth('');
                setSelectedYear('');
              }}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"
            >
              <span>সকল ফিল্টার ক্লিয়ার করুন</span>
            </button>
          )}
        </div>
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
            onClick={toggleLogsView}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-sm border uppercase tracking-widest ${
              showLogs ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <History size={16} />
            {showLogs ? 'তালিকায় ফিরুন' : 'ইতিহাস দেখুন'}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'summary' ? 'list' : 'summary')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-sm border uppercase tracking-widest ${
              viewMode === 'summary' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {viewMode === 'summary' ? 'সারাংশ দেখুন' : 'তালিকা দেখুন'}
          </button>
          <button
            onClick={exportToExcel}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 uppercase tracking-widest"
          >
            <Download size={16} />
            ডাউনলোড
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
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <History size={16} className="text-emerald-600" />
                অ্যাডমিন পরিবর্তনের ইতিহাস
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {logs.length.toLocaleString('bn-BD')} টি রেকর্ড • পৃষ্ঠা {logsPage} / {totalLogsPages}
              </span>
            </div>
            <div className="space-y-3">
              {paginatedLogs.length > 0 ? paginatedLogs.map(log => (
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
                  <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {log.adminName.charAt(0)}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">অ্যাডমিন: {log.adminName}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteLog(log.id, log.details)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 text-xs font-bold py-1 px-2 rounded-lg hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        মুছুন
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-slate-400 font-medium italic">কোনো ইতিহাস পাওয়া যায়নি।</div>
              )}
            </div>
            {/* Pagination Controls */}
            {totalLogsPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                  disabled={logsPage === 1}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalLogsPages) }, (_, i) => {
                    let pageNum;
                    if (totalLogsPages <= 5) {
                      pageNum = i + 1;
                    } else if (logsPage <= 3) {
                      pageNum = i + 1;
                    } else if (logsPage >= totalLogsPages - 2) {
                      pageNum = totalLogsPages - 4 + i;
                    } else {
                      pageNum = logsPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setLogsPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          logsPage === pageNum
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setLogsPage(prev => Math.min(totalLogsPages, prev + 1))}
                  disabled={logsPage === totalLogsPages}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        ) : viewMode === 'summary' ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-slate-800">সদস্য অনুযায়ী মাসিক জমার সারাংশ</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{filteredUsers.length.toLocaleString('bn-BD')} জন সদস্য</span>
            </div>
            
            {/* Month Selection Info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-emerald-800 text-sm mb-1">নির্বাচিত মাসের জমা</h4>
                  <p className="text-emerald-600 text-xs">
                    {selectedMonth && selectedYear 
                      ? `${selectedMonth} ${selectedYear} মাসের জন্য সকল সদস্যের জমা`
                      : selectedMonth 
                        ? `${selectedMonth} মাসের জন্য সকল সদস্যের জমা`
                        : selectedYear
                          ? `${selectedYear} সালের জন্য সকল সদস্যের জমা`
                          : 'সকল মাসের জন্য সকল সদস্যের জমা'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-800 font-bold text-sm">মোট জমা</p>
                  <p className="text-emerald-600 text-lg font-black">
                    {filteredFundings.reduce((sum, f) => sum + f.amount, 0).toLocaleString('bn-BD')} ৳
                  </p>
                </div>
              </div>
            </div>

            {/* Single Month Summary Table */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">সদস্যের নাম</th>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-center">মাস</th>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-center">জমার পরিমাণ</th>
                      <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      // Create array of users with their contributions for selected period
                      const usersWithContributions = filteredUsers.map(user => {
                        let userContribution = 0;
                        let contributionMonthYear = '';
                        
                        if (selectedMonth && selectedYear) {
                          const monthYear = `${selectedMonth} ${selectedYear}`;
                          userContribution = memberContributionMatrix[user.name]?.[monthYear] || 0;
                          contributionMonthYear = monthYear;
                        } else if (selectedMonth) {
                          const contributions = fundings.filter(f => 
                            f.userName === user.name && f.month === selectedMonth
                          );
                          userContribution = contributions.reduce((sum, f) => sum + f.amount, 0);
                          contributionMonthYear = selectedMonth;
                        } else if (selectedYear) {
                          const contributions = fundings.filter(f => 
                            f.userName === user.name && f.year.toString() === selectedYear
                          );
                          userContribution = contributions.reduce((sum, f) => sum + f.amount, 0);
                          contributionMonthYear = selectedYear;
                        } else {
                          userContribution = memberTotalsWithMatrix[user.name] || 0;
                          contributionMonthYear = 'সকল মাস';
                        }
                        
                        return {
                          user,
                          contribution: userContribution,
                          monthYear: contributionMonthYear
                        };
                      });
                      
                      // Sort: first non-contributors (0 amount), then contributors by amount ascending
                      usersWithContributions.sort((a, b) => {
                        if (a.contribution === 0 && b.contribution === 0) {
                          return a.user.name.localeCompare(b.user.name);
                        }
                        if (a.contribution === 0) return -1;
                        if (b.contribution === 0) return 1;
                        return a.contribution - b.contribution;
                      });
                      
                      return usersWithContributions.map(({ user, contribution, monthYear }) => (
                        <tr key={user.name} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                                contribution > 0 
                                  ? 'bg-emerald-50 text-emerald-600' 
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{user.name}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{user.role || 'member'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                              {monthYear}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className={`px-3 py-2 rounded-lg font-bold ${
                              contribution > 0 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-slate-50 text-slate-400'
                            }`}>
                              {contribution > 0 
                                ? `${contribution.toLocaleString('bn-BD')} ৳`
                                : '০ ৳'
                              }
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                              contribution > 0 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {contribution > 0 ? 'জমা হয়েছে' : 'জমা হয়নি'}
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                    {/* Total Row */}
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="p-4 font-bold text-slate-800">মোট</td>
                      <td className="p-4 text-center">
                        <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                          {selectedMonth && selectedYear 
                            ? `${selectedMonth} ${selectedYear}`
                            : selectedMonth 
                              ? selectedMonth
                              : selectedYear
                                ? selectedYear
                                : 'সকল মাস'
                          }
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="px-3 py-2 bg-emerald-600 text-white rounded-lg font-bold">
                          {filteredFundings.reduce((sum, f) => sum + f.amount, 0).toLocaleString('bn-BD')} ৳
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold">
                          মোট সংগ্রহ
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
