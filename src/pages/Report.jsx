import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Download, Search, Filter, Calendar,
  AlertCircle, Loader2, RefreshCw, BarChart2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Header from '../components/Header';
import apiClient from '../services/apiClient'; // ✅ uses your existing axios instance

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 100; // matches API default limit

const OPCO_OPTIONS = [
  { value: '',                        label: 'All OPCOs' },
  { value: 'allegiscorporateservices',label: 'Allegis Corporate Services' },
  { value: 'actalent',                label: 'Actalent' },
  { value: 'aerotek',                 label: 'Aerotek' },
  { value: 'actalentservices',        label: 'Actalent Services' },
  { value: 'aerotekservices',         label: 'Aerotek Services' },
  { value: 'astoncarter',             label: 'Aston Carter' },
  { value: 'teksystems',              label: 'TekSystems' },
  { value: 'tekglobalservices',       label: 'Tek Global Services' },
  { value: 'tgs',                     label: 'TGS' },
];

const PERSONA_OPTIONS = [
  { value: '',               label: 'All Personas' },
  { value: 'fsg',            label: 'FSG' },
  { value: 'front_office',   label: 'Front Office' },
  { value: 'producer',       label: 'Producer' },
  { value: 'osg',            label: 'OSG' },
  { value: 'back_office',    label: 'Back Office' },
  { value: 'support',        label: 'Support' },
  { value: 'support_services', label: 'Support Services' },
  { value: 'shared_service', label: 'Shared Service' },
  { value: 'shared_services',label: 'Shared Services' },
  { value: 'onboarding',     label: 'Onboarding' },
  { value: 'producers',      label: 'Producers' },
];

const LOG_COLUMNS = [
  { key: 'user_name',      label: 'User Name',     width: 'w-32' },
  { key: 'job_title',      label: 'Job Title',     width: 'w-32' },
  { key: 'opco',           label: 'OPCO',          width: 'w-28' },
  { key: 'persona',        label: 'Persona',       width: 'w-24' },
  { key: 'date_and_time',  label: 'Date & Time',   width: 'w-36' },
  { key: 'query',          label: 'Query',         width: 'w-48' },
  { key: 'ai_response',    label: 'AI Response',   width: 'w-64' },
  { key: 'citations',      label: 'Citations',     width: 'w-40' },
  { key: 'feedback_type',  label: 'Feedback',      width: 'w-24' },
  { key: 'feedback',       label: 'Feedback Note', width: 'w-40' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDateTime = (str) => {
  if (!str) return '—';
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return str; }
};

const truncate = (text, max = 120) => {
  if (!text) return '—';
  const s = String(text);
  return s.length > max ? s.slice(0, max) + '…' : s;
};

const todayStr   = () => new Date().toISOString().split('T')[0];
const minus30Str = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

// Build URLSearchParams from an object, skipping empty values
const buildParams = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) p.append(k, v);
  });
  return p;
};

// ─────────────────────────────────────────────────────────────────────────────
// Summary Card
// ─────────────────────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, color = 'text-[#174a7e]' }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3 flex flex-col gap-0.5">
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Report Component
// ─────────────────────────────────────────────────────────────────────────────
const Report = () => {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [searchTerm,           setSearchTerm]           = useState('');
  const [fromDate,             setFromDate]             = useState(minus30Str());
  const [toDate,               setToDate]               = useState(todayStr());
  const [selectedUser,         setSelectedUser]         = useState('');
  const [selectedFeedbackType, setSelectedFeedbackType] = useState('');
  const [selectedOpco,         setSelectedOpco]         = useState('');
  const [selectedPersona,      setSelectedPersona]      = useState('');

  // ── Data state ────────────────────────────────────────────────────────────
  const [tableData,   setTableData]   = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [sumLoading,  setSumLoading]  = useState(false);
  const [error,       setError]       = useState(null);

  // ── Server-side pagination ────────────────────────────────────────────────
  const [offset,      setOffset]      = useState(0);
  const [hasMore,     setHasMore]     = useState(true);
  // We track whether we're in "filtered" or "all" mode
  const [isFiltered,  setIsFiltered]  = useState(false);

  // ── Fetch /api/report/all ─────────────────────────────────────────────────
  const fetchAll = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams({ limit: ITEMS_PER_PAGE, offset: newOffset });
      /*const res = await apiClient.get(`/api/report/all?${params}`);
      const rows = res.data?.data || [];
      setTableData(newOffset === 0 ? rows : (prev) => [...prev, ...rows]);
      setHasMore(rows.length === ITEMS_PER_PAGE);
      setOffset(newOffset);
      setIsFiltered(false);*/
      // 🚫 Report API disabled
      setTableData([]);
      setHasMore(false);
      setIsFiltered(false);
    } catch (e) {
      setError(e?.response?.data?.detail?.[0]?.msg || e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch /api/report/filter ──────────────────────────────────────────────
  const fetchFiltered = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams({
        start_date:    fromDate       || undefined,
        end_date:      toDate         || undefined,
        feedback_type: selectedFeedbackType || undefined,
        persona:       selectedPersona      || undefined,
        opco:          selectedOpco         || undefined,
        user_name:     selectedUser         || undefined,
        limit:         ITEMS_PER_PAGE,
        offset:        newOffset,
      });
      //const res = await apiClient.get(`/api/report/filter?${params}`);
//const rows = res.data?.data || [];
// 🚫 Report filter API disabled
const rows = [];


// Build summary manually from rows
const thumbsUp = rows.filter(r => r.feedback_type === 'thumbs_up').length;
const thumbsDown = rows.filter(r => r.feedback_type === 'thumbs_down').length;
const uniqueUsers = new Set(rows.map(r => r.user_name)).size;

setSummaryData({
  total_records: rows.length,
  unique_users: uniqueUsers,
  thumbs_up: thumbsUp,
  thumbs_down: thumbsDown,
});

      setTableData(newOffset === 0 ? rows : (prev) => [...prev, ...rows]);
      setHasMore(rows.length === ITEMS_PER_PAGE);
      setOffset(newOffset);
      setIsFiltered(true);
    } catch (e) {
      setError(e?.response?.data?.detail?.[0]?.msg || e.message || 'Failed to filter data');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedFeedbackType, selectedPersona, selectedOpco, selectedUser]);

  // ── Fetch /api/report/filter ─────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setSumLoading(true);
    try {
      const params = buildParams({
        start_date:    fromDate              || undefined,
        end_date:      toDate               || undefined,
        feedback_type: selectedFeedbackType || undefined,
        user_name:     selectedUser         || undefined,
      });
      //const res = await apiClient.get(`/api/report/filter?${params}`);
      //setSummaryData(res.data);
      setSummaryData(null);
    } catch (e) {
      console.error('Summary fetch failed:', e);
      setSummaryData(null);
    } finally {
      setSumLoading(false);
    }
  }, [fromDate, toDate, selectedFeedbackType, selectedUser]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll(0);
    fetchSummary();
  }, []); // eslint-disable-line

  // ── Apply filters ─────────────────────────────────────────────────────────
  const handleApply = () => {
    setOffset(0);
    fetchFiltered(0);
    fetchSummary();
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSearchTerm('');
    setSelectedUser('');
    setSelectedFeedbackType('');
    setSelectedOpco('');
    setSelectedPersona('');
    setFromDate(minus30Str());
    setToDate(todayStr());
    setOffset(0);
    fetchAll(0);
    fetchSummary();
  };

  // ── Load more (server pagination) ────────────────────────────────────────
  const handleLoadMore = () => {
    const nextOffset = offset + ITEMS_PER_PAGE;
    if (isFiltered) fetchFiltered(nextOffset);
    else             fetchAll(nextOffset);
  };

  // ── Client-side search across loaded rows ──────────────────────────────
  const displayData = useMemo(() => {
    if (!searchTerm) return tableData;
    const q = searchTerm.toLowerCase();
    return tableData.filter((row) =>
      Object.values(row).some((v) => v && String(v).toLowerCase().includes(q))
    );
  }, [searchTerm, tableData]);

  // ── Export visible (filtered) rows ────────────────────────────────────────
  const handleExport = () => {
    if (displayData.length === 0) { alert('No data to export'); return; }
    const header = LOG_COLUMNS.map((c) => c.label).join(',');
    const rows   = displayData.map((row) =>
      LOG_COLUMNS.map((c) => {
        const v = String(row[c.key] ?? '').replace(/"/g, '""').replace(/\n/g, ' ');
        return `"${v}"`;
      }).join(',')
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `report_${todayStr()}.csv`,
      style: 'visibility:hidden',
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />

      <div className="flex-grow p-6">
        <div className="w-[95%] max-w-[1600px] mx-auto space-y-5">

          {/* ── Page header ─────────────────────────────────────────────── */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BarChart2 size={22} className="text-[#174a7e]" />
              <h1 className="text-xl font-bold text-[#174a7e]">Report Generator</h1>
            </div>
            <button
              onClick={handleExport}
              disabled={displayData.length === 0 || loading}
              className="flex items-center gap-2 px-5 py-2 bg-[#174a7e] text-white rounded-md text-sm hover:bg-[#082340] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>

          {/* ── Summary cards ────────────────────────────────────────────── 
          {(summaryData || sumLoading) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sumLoading ? (
                <div className="col-span-4 flex justify-center py-4">
                  <Loader2 size={22} className="animate-spin text-[#174a7e]" />
                </div>
              ) : (
                <>
                  <SummaryCard label="Total Records"  value={summaryData?.total_records}  />
                  <SummaryCard label="Unique Users"   value={summaryData?.unique_users}   />
                  <SummaryCard label="👍 Thumbs Up"   value={summaryData?.thumbs_up}    color="text-green-600" />
                  <SummaryCard label="👎 Thumbs Down" value={summaryData?.thumbs_down}  color="text-red-500"   />
                </>
              )}
            </div>
          )}*/}

          {/* ── Filter panel ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 items-end">

              {/* Search */}
              <div className="xl:col-span-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Search size={11} className="inline mr-1" />Search
                </label>
                <input
                  type="text"
                  placeholder="Search rows…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-[#174a7e] focus:border-[#174a7e] outline-none"
                />
              </div>

              {/* From Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Calendar size={11} className="inline mr-1" />From
                </label>
                <input
                  type="date" value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-[#174a7e] focus:border-[#174a7e] outline-none"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Calendar size={11} className="inline mr-1" />To
                </label>
                <input
                  type="date" value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-[#174a7e] focus:border-[#174a7e] outline-none"
                />
              </div>

              {/* OPCO — NEW */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Filter size={11} className="inline mr-1" />OPCO
                </label>
                <select
                  value={selectedOpco}
                  onChange={(e) => setSelectedOpco(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-[#174a7e] focus:border-[#174a7e] outline-none"
                >
                  {OPCO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Persona — NEW */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Filter size={11} className="inline mr-1" />Persona
                </label>
                <select
                  value={selectedPersona}
                  onChange={(e) => setSelectedPersona(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-[#174a7e] focus:border-[#174a7e] outline-none"
                >
                  {PERSONA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Feedback Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Filter size={11} className="inline mr-1" />Feedback
                </label>
                <select
                  value={selectedFeedbackType}
                  onChange={(e) => setSelectedFeedbackType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-[#174a7e] focus:border-[#174a7e] outline-none"
                >
                  <option value="">All Types</option>
                  <option value="thumbs_up">👍 Thumbs Up</option>
                  <option value="thumbs_down">👎 Thumbs Down</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleApply}
                  disabled={loading}
                  className="flex-1 px-3 py-1.5 bg-[#174a7e] text-white rounded-md text-sm hover:bg-[#082340] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={12} />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* ── Error ────────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* ── Table ────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

            {/* Row count */}
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-500">
                {loading
                  ? 'Loading…'
                  : `${displayData.length} row${displayData.length !== 1 ? 's' : ''} displayed`}
              </p>
              {isFiltered && (
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                  Filtered view
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {LOG_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={`${col.width} px-3 py-2.5 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && displayData.length === 0 ? (
                    <tr>
                      <td colSpan={LOG_COLUMNS.length} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Loader2 size={28} className="animate-spin text-[#174a7e]" />
                          <span className="text-sm">Loading data…</span>
                        </div>
                      </td>
                    </tr>
                  ) : displayData.length === 0 ? (
                    <tr>
                      <td colSpan={LOG_COLUMNS.length} className="py-16 text-center text-sm text-gray-400">
                        No records found. Try adjusting filters.
                      </td>
                    </tr>
                  ) : (
                    displayData.map((row, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'}
                      >
                        {LOG_COLUMNS.map((col) => (
                          <td key={col.key} className={`${col.width} px-3 py-2.5 text-gray-800 align-top`}>
                            {col.key === 'date_and_time' ? (
                              <span className="whitespace-nowrap text-xs">{formatDateTime(row[col.key])}</span>
                            ) : col.key === 'feedback_type' ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                                ${row[col.key] === 'thumbs_up'
                                  ? 'bg-green-100 text-green-700'
                                  : row[col.key] === 'thumbs_down'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-500'}
                              `}>
                                {row[col.key] === 'thumbs_up'   ? 'Good'
                                 : row[col.key] === 'thumbs_down' ? 'Bad'
                                 : row[col.key] ?? '—'}
                              </span>
                            ) : (col.key === 'ai_response' || col.key === 'query' || col.key === 'citations') ? (
                              <span title={row[col.key]} className="text-xs">
                                {truncate(row[col.key])}
                              </span>
                            ) : (
                              <span className="text-xs">{row[col.key] ?? '—'}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Load More (server-side pagination) ── */}
            {!loading && hasMore && displayData.length > 0 && (
              <div className="flex justify-center py-4 border-t border-gray-100">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft size={14} className="rotate-90" />
                  Load next {ITEMS_PER_PAGE} rows
                  <ChevronRight size={14} className="rotate-90" />
                </button>
              </div>
            )}

            {/* Loading more rows indicator */}
            {loading && displayData.length > 0 && (
              <div className="flex justify-center py-4 border-t border-gray-100">
                <Loader2 size={18} className="animate-spin text-[#174a7e]" />
                <span className="ml-2 text-sm text-gray-500">Loading more…</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Report;
