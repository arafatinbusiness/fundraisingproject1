import React, { useState, useMemo, useEffect } from 'react';
import { Download, Search, Calendar, User as UserIcon, ChevronRight, X, History, Clock, ChevronLeft, ChevronRight as ChevronRightIcon, Phone, MessageCircle, ArrowLeft } from 'lucide-react';
import { Funding, User, Log } from '../types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, DocumentSnapshot } from 'firebase/firestore';

interface DashboardProps {
  fundings: Funding[];
  users: User[];
  fundName: string;
}

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const Dashboard: React.FC<DashboardProps> = ({ fundings, users, fundName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'main' | 'member' | 'history'>('main');

  // Get available years
  const years = useMemo(() => {
    const yrs = new Set(fundings.map(f => f.year.toString()));
    return (Array.from(yrs) as string[]).sort((a, b) => b.localeCompare(a));
  }, [fundings]);

  // State for logs and pagination
  const [logs, setLogs] = useState<Log[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  // Fetch logs from Firebase
  const fetchLogs = async (isInitial = true) => {
    setLoadingLogs(true);
    try {
      let q;
      if (isInitial) {
        q = query(
          collection(db, 'logs'),
          orderBy('timestamp', 'desc'),
          limit(logsPerPage)
        );
      } else if (lastVisible) {
        q = query(
          collection(db, 'logs'),
          orderBy('timestamp', 'desc'),
          startAfter(lastVisible),
          limit(logsPerPage)
        );
      } else {
        return;
      }

      const querySnapshot = await getDocs(q);
      const newLogs: Log[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        newLogs.push({ 
          id: doc.id, 
          type: data.type || '',
          details: data.details || '',
          timestamp: data.timestamp || '',
          adminId: data.adminId || '',
          adminName: data.adminName || ''
        } as Log);
      });

      if (isInitial) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(querySnapshot.docs.length === logsPerPage);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load initial logs
  useEffect(() => {
    fetchLogs(true);
  }, []);

  // Load more logs
  const loadMoreLogs = () => {
    if (!loadingLogs && hasMore) {
      fetchLogs(false);
      setCurrentPage(prev => prev + 1);
    }
  };

  // Go to previous page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      // For simplicity, we'll just show first page
      fetchLogs(true);
    }
  };

  // Filter fundings based on selected month/year
  const filteredFundings = useMemo(() => {
    return fundings.filter(f => {
      const matchesMonth = selectedMonth ? f.month === selectedMonth : true;
      const matchesYear = selectedYear ? f.year.toString() === selectedYear : true;
      return matchesMonth && matchesYear;
    });
  }, [fundings, selectedMonth, selectedYear]);

  // Calculate total amount
  const totalAmount = useMemo(() => fundings.reduce((sum, f) => sum + f.amount, 0), [fundings]);

  // Create member data for main table
  const memberData = useMemo(() => {
    const data = users.map(user => {
      let contribution = 0;
      let monthYear = '';
      let displayText = '';
      
      if (selectedMonth && selectedYear) {
        // Find contribution for specific month/year
        const funding = fundings.find(f => 
          f.userName === user.name && 
          f.month === selectedMonth && 
          f.year.toString() === selectedYear
        );
        contribution = funding?.amount || 0;
        monthYear = `${selectedMonth} ${selectedYear}`;
        displayText = `${selectedMonth} ${selectedYear}`;
      } else if (selectedMonth) {
        // Find total for selected month across all years
        const contributions = fundings.filter(f => 
          f.userName === user.name && f.month === selectedMonth
        );
        contribution = contributions.reduce((sum, f) => sum + f.amount, 0);
        monthYear = selectedMonth;
        // Show years when this member contributed for this month
        const years = [...new Set(contributions.map(f => f.year.toString()))].sort((a, b) => b.localeCompare(a));
        displayText = years.length > 0 
          ? `${selectedMonth} (${years.join(', ')})`
          : `${selectedMonth}`;
      } else if (selectedYear) {
        // Find total for selected year across all months
        const contributions = fundings.filter(f => 
          f.userName === user.name && f.year.toString() === selectedYear
        );
        contribution = contributions.reduce((sum, f) => sum + f.amount, 0);
        monthYear = selectedYear;
        displayText = selectedYear;
      } else {
        // Find total across all time
        const contributions = fundings.filter(f => f.userName === user.name);
        contribution = contributions.reduce((sum, f) => sum + f.amount, 0);
        monthYear = 'সকল মাস';
        // Show total years of contribution
        const years = [...new Set(contributions.map(f => f.year.toString()))].sort((a, b) => b.localeCompare(a));
        displayText = years.length > 0 
          ? `সকল মাস (${years.join(', ')})`
          : 'সকল মাস';
      }
      
      return {
        user,
        contribution,
        monthYear,
        displayText,
        hasContributed: contribution > 0
      };
    });

    // Sort: non-contributors first, then contributors by amount ascending
    return data.sort((a, b) => {
      if (!a.hasContributed && !b.hasContributed) {
        return a.user.name.localeCompare(b.user.name);
      }
      if (!a.hasContributed) return -1;
      if (!b.hasContributed) return 1;
      return a.contribution - b.contribution;
    });
  }, [users, fundings, selectedMonth, selectedYear]);

  // Filter member data based on search term
  const filteredMemberData = useMemo(() => {
    return memberData.filter(item => 
      item.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [memberData, searchTerm]);

  // Get selected member's monthly contributions
  const memberMonthlyContributions = useMemo(() => {
    if (!selectedMember) return [];
    
    const contributions = fundings.filter(f => f.userName === selectedMember.name);
    
    // Create array for all months
    const monthlyData = MONTHS_BN.map(month => {
      const monthContributions = contributions.filter(f => f.month === month);
      const total = monthContributions.reduce((sum, f) => sum + f.amount, 0);
      
      return {
        month,
        contributions: monthContributions,
        total,
        years: [...new Set(monthContributions.map(f => f.year.toString()))].sort((a, b) => b.localeCompare(a))
      };
    });
    
    return monthlyData;
  }, [selectedMember, fundings]);

  // Export to Excel with professional styling (member rows with month columns)
  const exportToExcel = () => {
    // Get selected year or use current year
    const targetYear = selectedYear || new Date().getFullYear().toString();
    
    // Create headers: Member name + all months
    const headers = [
      ['তহবিল সংগ্রহ রিপোর্ট', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`তহবিলের নাম: ${fundName || 'তহবিল ড্যাশবোর্ড'}`, '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`রিপোর্ট বছর: ${targetYear}`, '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`রিপোর্ট তারিখ: ${format(new Date(), 'dd MMMM yyyy', { locale: bn })}`, '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['সদস্যের নাম', ...MONTHS_BN, 'মোট', 'স্ট্যাটাস']
    ];

    // Create data rows: each member with contributions for each month
    const data = users.map(user => {
      const row = [user.name];
      let total = 0;
      let hasContributed = false;
      
      // Add amount for each month
      MONTHS_BN.forEach(month => {
        const funding = fundings.find(f => 
          f.userName === user.name && 
          f.month === month && 
          f.year.toString() === targetYear
        );
        const amount = funding?.amount || 0;
        row.push(amount);
        total += amount;
        if (amount > 0) hasContributed = true;
      });
      
      // Add total and status
      row.push(total);
      row.push(hasContributed ? 'জমা হয়েছে' : 'জমা হয়নি');
      
      return row;
    });

    // Add summary row
    const summaryRow = ['সারাংশ'];
    let grandTotal = 0;
    
    // Month totals
    MONTHS_BN.forEach(month => {
      const monthTotal = fundings
        .filter(f => f.month === month && f.year.toString() === targetYear)
        .reduce((sum, f) => sum + f.amount, 0);
      summaryRow.push(monthTotal);
      grandTotal += monthTotal;
    });
    
    // Add grand total and summary
    summaryRow.push(grandTotal);
    summaryRow.push(`মোট সংগ্রহ: ${grandTotal.toLocaleString('bn-BD')} ৳`);

    // Combine all rows
    const allRows = [...headers, ...data, ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''], summaryRow];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    // Define column widths
    const colWidths = [
      { wch: 25 }, // সদস্যের নাম
      ...MONTHS_BN.map(() => ({ wch: 12 })), // Month columns
      { wch: 15 }, // মোট
      { wch: 15 }  // স্ট্যাটাস
    ];
    ws['!cols'] = colWidths;

    // Apply styling through cell properties
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:O1');
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        
        if (!ws[cell_ref]) continue;
        
        // Title rows (rows 0-4)
        if (R < 5) {
          ws[cell_ref].s = {
            font: { bold: true, sz: R === 0 ? 16 : 12 },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: R === 0 ? "4CAF50" : "E8F5E9" } } // Green background
          };
        }
        
        // Column headers (row 5)
        if (R === 5) {
          ws[cell_ref].s = {
            font: { bold: true, color: { rgb: C === 0 ? "000000" : "FFFFFF" } },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: C === 0 ? "FFE0B2" : "2196F3" } }, // Orange for name, blue for months
            border: {
              top: { style: 'thin', color: { rgb: "000000" } },
              bottom: { style: 'thin', color: { rgb: "000000" } },
              left: { style: 'thin', color: { rgb: "000000" } },
              right: { style: 'thin', color: { rgb: "000000" } }
            }
          };
        }
        
        // Data rows (member rows)
        if (R >= 6 && R < 6 + users.length) {
          const dataIndex = R - 6;
          const user = users[dataIndex];
          const hasContributed = data[dataIndex][data[dataIndex].length - 1] === 'জমা হয়েছে';
          
          // Member name cell
          if (C === 0) {
            ws[cell_ref].s = {
              font: { bold: true },
              alignment: { horizontal: 'left', vertical: 'center' },
              fill: { fgColor: { rgb: hasContributed ? "F1F8E9" : "FFEBEE" } },
              border: {
                bottom: { style: 'thin', color: { rgb: "E0E0E0" } }
              }
            };
          }
          // Month amount cells
          else if (C <= MONTHS_BN.length) {
            const amount = data[dataIndex][C];
            ws[cell_ref].s = {
              font: { bold: amount > 0 },
              alignment: { horizontal: 'right', vertical: 'center' },
              fill: { fgColor: { rgb: amount > 0 ? "E8F5E9" : "F5F5F5" } },
              border: {
                bottom: { style: 'thin', color: { rgb: "E0E0E0" } }
              }
            };
            // Format as number with comma
            if (amount > 0) {
              ws[cell_ref].z = '#,##0';
            }
          }
          // Total column
          else if (C === MONTHS_BN.length + 1) {
            const total = data[dataIndex][MONTHS_BN.length + 1];
            ws[cell_ref].s = {
              font: { bold: true, color: { rgb: total > 0 ? "1B5E20" : "757575" } },
              alignment: { horizontal: 'right', vertical: 'center' },
              fill: { fgColor: { rgb: total > 0 ? "C8E6C9" : "F5F5F5" } },
              border: {
                bottom: { style: 'thin', color: { rgb: "E0E0E0" } }
              }
            };
            ws[cell_ref].z = '#,##0';
          }
          // Status column
          else if (C === MONTHS_BN.length + 2) {
            ws[cell_ref].s = {
              font: { bold: true, color: { rgb: hasContributed ? "1B5E20" : "D32F2F" } },
              alignment: { horizontal: 'center', vertical: 'center' },
              fill: { fgColor: { rgb: hasContributed ? "E8F5E9" : "FFEBEE" } },
              border: {
                bottom: { style: 'thin', color: { rgb: "E0E0E0" } }
              }
            };
          }
        }
        
        // Summary row
        if (R === 6 + users.length + 1) {
          ws[cell_ref].s = {
            font: { bold: true, sz: 12 },
            alignment: { 
              horizontal: C === 0 ? 'left' : 'right',
              vertical: 'center' 
            },
            fill: { fgColor: { rgb: "F5F5F5" } },
            border: {
              top: { style: 'medium', color: { rgb: "000000" } },
              bottom: { style: 'thin', color: { rgb: "000000" } }
            }
          };
          // Format numbers in summary
          if (C > 0 && C <= MONTHS_BN.length + 1) {
            ws[cell_ref].z = '#,##0';
          }
        }
      }
    }

    // Merge cells for title rows
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: MONTHS_BN.length + 3 } }, // Main title
      { s: { r: 1, c: 0 }, e: { r: 1, c: MONTHS_BN.length + 3 } }, // Fund name
      { s: { r: 2, c: 0 }, e: { r: 2, c: MONTHS_BN.length + 3 } }, // Report year
      { s: { r: 3, c: 0 }, e: { r: 3, c: MONTHS_BN.length + 3 } }  // Report date
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${targetYear} তহবিল রিপোর্ট`);
    XLSX.writeFile(wb, `তহবিল_রিপোর্ট_${targetYear}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedMonth('');
    setSelectedYear('');
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 mb-2">{fundName || 'তহবিল ড্যাশবোর্ড'}</h1>
        <div className="flex items-center justify-between">
          <p className="text-slate-600 text-sm">
            মোট সংগ্রহ: <span className="font-bold text-emerald-600">{totalAmount.toLocaleString('bn-BD')} ৳</span>
          </p>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
          >
            <Download size={16} />
            ডাউনলোড
          </button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={20} className="text-emerald-600" />
            মাস সিলেক্ট করুন
          </h2>
          {(selectedMonth || selectedYear) && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <X size={14} />
              ক্লিয়ার
            </button>
          )}
        </div>

        {/* Month Selector */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-600 mb-2">মাস</h3>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS_BN.map(month => (
              <button
                key={month}
                onClick={() => setSelectedMonth(selectedMonth === month ? '' : month)}
                className={`py-3 rounded-lg text-sm font-bold transition-all ${
                  selectedMonth === month
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {month}
              </button>
            ))}
          </div>
        </div>

        {/* Year Selector */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-2">বছর</h3>
          <div className="flex flex-wrap gap-2">
            {years.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(selectedYear === year ? '' : year)}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${
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

        {/* Selected Info */}
        {(selectedMonth || selectedYear) && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-700">
              নির্বাচিত: 
              <span className="font-bold text-emerald-600 ml-2">
                {selectedMonth} {selectedYear}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl p-1 mb-4 shadow-sm">
        <div className="flex">
          <button
            onClick={() => setViewMode('main')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              viewMode === 'main' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            সদস্য তালিকা
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              viewMode === 'history' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <History size={16} />
              অ্যাক্টিভিটি লগ
            </div>
          </button>
        </div>
      </div>

      {/* Search (only show in main view) */}
      {viewMode === 'main' && (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="সদস্যের নাম খুঁজুন (যেমন: A, সজল, etc.)..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Quick Member Access */}
          {searchTerm && filteredMemberData.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">দ্রুত অ্যাক্সেস:</p>
              <div className="flex flex-wrap gap-2">
                {filteredMemberData.slice(0, 3).map(item => (
                  <button
                    key={item.user.name}
                    onClick={() => {
                      setSelectedMember(item.user);
                      setViewMode('member');
                      setSearchTerm('');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <UserIcon size={14} />
                    {item.user.name} এর মাসিক হিসাব দেখুন
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {viewMode === 'main' ? (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Main Table */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">
                  সদস্য তালিকা ({users.length} জন)
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedMonth || selectedYear 
                    ? `নির্বাচিত মাসের জন্য সকল সদস্য`
                    : 'সকল মাসের জন্য সকল সদস্য'
                  }
                  {searchTerm && (
                    <span className="text-emerald-600 font-medium">
                      (ফিল্টার করা: {filteredMemberData.length} জন)
                    </span>
                  )}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-left text-sm font-bold text-slate-600">সদস্যের নাম</th>
                      <th className="p-4 text-center text-sm font-bold text-slate-600">মাস</th>
                      <th className="p-4 text-center text-sm font-bold text-slate-600">পরিমাণ</th>
                      <th className="p-4 text-center text-sm font-bold text-slate-600">বিস্তারিত</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMemberData.map((item, index) => (
                      <tr 
                        key={item.user.name} 
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          !item.hasContributed ? 'bg-red-50/30' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                              item.hasContributed 
                                ? 'bg-emerald-100 text-emerald-600' 
                                : 'bg-slate-200 text-slate-500'
                            }`}>
                              {item.user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{item.user.name}</p>
                              <p className="text-xs text-slate-500">{item.user.role || 'member'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                            {item.displayText}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`inline-block px-3 py-2 rounded-lg font-bold ${
                            item.hasContributed 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.hasContributed 
                              ? `${item.contribution.toLocaleString('bn-BD')} ৳`
                              : '০ ৳'
                            }
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedMember(item.user);
                              setViewMode('member');
                            }}
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            বিস্তারিত
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredMemberData.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-sm">কোনো সদস্য পাওয়া যায়নি</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : viewMode === 'member' ? (
          <motion.div
            key="member"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Member Detail View */}
            {selectedMember && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {/* Sticky Top Bar */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setViewMode('main');
                      }}
                      className="flex items-center gap-2 text-slate-700 hover:text-slate-900 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors font-medium"
                    >
                      <ArrowLeft size={20} />
                      <span>ফিরে যান</span>
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-lg font-bold">
                        {selectedMember.name.charAt(0)}
                      </div>
                      <div className="text-right">
                        <h2 className="text-lg font-bold text-slate-900">{selectedMember.name}</h2>
                        <p className="text-xs text-slate-600">{selectedMember.role || 'member'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact CTAs */}
                {selectedMember.phone && (
                  <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">ফোন নম্বর:</span>
                        <span className="text-sm font-bold text-slate-900">{selectedMember.phone}</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {/* WhatsApp Button */}
                      <a
                        href={`https://wa.me/${selectedMember.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors"
                      >
                        <MessageCircle size={16} />
                        WhatsApp
                      </a>
                      {/* Phone Call Button */}
                      <a
                        href={`tel:${selectedMember.phone}`}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                      >
                        <Phone size={16} />
                        কল করুন
                      </a>
                    </div>
                  </div>
                )}

                {/* Member Monthly Contributions */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">মাসিক জমার হিসাব</h3>
                  
                  <div className="space-y-3">
                    {memberMonthlyContributions.map((monthData) => (
                      <div 
                        key={monthData.month}
                        className={`p-4 rounded-xl border ${
                          monthData.total > 0 
                            ? 'border-emerald-200 bg-emerald-50' 
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-slate-800">{monthData.month}</h4>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            monthData.total > 0 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {monthData.total > 0 
                              ? `${monthData.total.toLocaleString('bn-BD')} ৳`
                              : '০ ৳'
                          }
                        </span>
                      </div>
                      
                      {monthData.total > 0 ? (
                        <div className="mt-2">
                          <p className="text-sm text-slate-600 mb-1">জমা দেওয়া বছর:</p>
                          <div className="flex flex-wrap gap-1">
                            {monthData.years.map(year => (
                              <span 
                                key={year}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                              >
                                {year}
                              </span>
                            ))}
                          </div>
                          {monthData.contributions.map((funding, idx) => (
                            <div key={idx} className="mt-2 text-sm text-slate-700">
                              <p>
                                {funding.year} সালে: {funding.amount.toLocaleString('bn-BD')} ৳
                                <span className="text-xs text-slate-500 ml-2">
                                  ({format(new Date(funding.updatedAt), 'dd MMM yyyy', { locale: bn })})
                                </span>
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 mt-2">এই মাসে কোনো জমা নেই</p>
                      )}
                    </div>
                    ))}
                  </div>
                  
                  {/* Total Summary */}
                  <div className="mt-6 p-4 bg-slate-100 rounded-xl">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800">মোট জমা</h4>
                      <span className="text-xl font-black text-emerald-600">
                        {memberMonthlyContributions
                          .reduce((sum, month) => sum + month.total, 0)
                          .toLocaleString('bn-BD')} ৳
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">
                      {selectedMember.name} এর সকল মাসের মোট জমা
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* History/Logs View */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                      <History size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">অ্যাক্টিভিটি লগ</h2>
                      <p className="text-sm text-slate-600">অ্যাডমিনদের সকল কার্যকলাপের ইতিহাস</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      পৃষ্ঠা {currentPage}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {loadingLogs && logs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-sm">লোড হচ্ছে...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-sm">কোনো অ্যাক্টিভিটি লগ পাওয়া যায়নি</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div 
                        key={log.id}
                        className="p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-slate-800">{log.details}</h4>
                            <p className="text-xs text-slate-500 mt-1">
                              অ্যাডমিন: <span className="font-medium">{log.adminName}</span>
                            </p>
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg ${
                            log.type.includes('delete') 
                              ? 'bg-red-50 text-red-600' 
                              : log.type.includes('update') 
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}>
                            {log.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock size={12} />
                            {log.timestamp ? format(new Date(log.timestamp), 'dd MMM yyyy, hh:mm a', { locale: bn }) : 'তারিখ নেই'}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {log.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1 || loadingLogs}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                      পূর্ববর্তী
                    </button>
                    <span className="text-sm text-slate-600">
                      পৃষ্ঠা {currentPage}
                    </span>
                    <button
                      onClick={loadMoreLogs}
                      disabled={!hasMore || loadingLogs}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      পরবর্তী
                      <ChevronRightIcon size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    {hasMore ? 'আরও লগ আছে' : 'সকল লগ দেখানো হয়েছে'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
