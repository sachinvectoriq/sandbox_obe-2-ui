// src/pages/Report.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Download, Search, Filter, Calendar,
  AlertCircle, Loader2, RefreshCw, BarChart2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import Header from '../components/Header';
import apiClient from '../services/apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 100;

const OPCO_OPTIONS = [
  { value: '',                         label: 'All OPCOs' },
  { value: 'allegiscorporateservices', label: 'Allegis Corporate Services' },
  { value: 'actalent',                 label: 'Actalent' },
  { value: 'aerotek',                  label: 'Aerotek' },
  { value: 'actalentservices',         label: 'Actalent Services' },
  { value: 'aerotekservices',          label: 'Aerotek Services' },
  { value: 'astoncarter',              label: 'Aston Carter' },
  { value: 'teksystems',               label: 'TekSystems' },
  { value: 'tekglobalservices',        label: 'Tek Global Services' },
  { value: 'tgs',                      label: 'TGS' },
];

const PERSONA_OPTIONS = [
  { value: '',                label: 'All Personas' },
  { value: 'fsg',             label: 'FSG' },
  { value: 'front_office',    label: 'Front Office' },
  { value: 'producer',        label: 'Producer' },
  { value: 'osg',             label: 'OSG' },
  { value: 'back_office',     label: 'Back Office' },
  { value: 'support',         label: 'Support' },
  { value: 'support_services',label: 'Support Services' },
  { value: 'shared_service',  label: 'Shared Service' },
  { value: 'shared_services', label: 'Shared Services' },
  { value: 'onboarding',      label: 'Onboarding' },
  { value: 'producers',       label: 'Producers' },
];

const LOG_COLUMNS = [
  { key: 'user_name',     label: 'User Name',     width: 'w-32' },
  { key: 'job_title',     label: 'Job Title',     width: 'w-32' },
  { key: 'opco',          label: 'OPCO',          width: 'w-28' },
  { key: 'persona',       label: 'Persona',       width: 'w-24' },
  { key: 'date_and_time', label: 'Date & Time',   width: 'w-36' },
  { key: 'query',         label: 'Query',         width: 'w-48' },
  { key: 'ai_response',   label: 'AI Response',   width: 'w-64' },
  { key: 'citations',     label: 'Citations',     width: 'w-40' },
  { key: 'feedback',      label: 'Feedback Note', width: 'w-40' },
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

// Build URLSearchParams, skipping empty/null/undefined values
const buildParams = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) p.append(k, v);
  });
  return p;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Report Component
// ─────────────────────────────────────────────────────────────────────────────
const Report = () => {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [searchTerm,    setSearchTerm]    = useState('');
  const [fromDate,      setFromDate]      = useState(minus30Str());
  const [toDate,        setToDate]        = useState(todayStr());
  const [selectedUser,  setSelectedUser]  = useState('');
  const [selectedOpco,  setSelectedOpco]  = useState('');
  const [selectedPersona, setSelectedPersona] = useState('');

  // ── Data state ────────────────────────────────────────────────────────────
  const [tableData,    setTableData]    = useState([]);
  const [distinctUsers, setDistinctUsers] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  // ── Server-side pagination ────────────────────────────────────────────────
  const [offset,   setOffset]   = useState(0);
  const [hasMore,  setHasMore]  = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch unique users for dropdown
  // GET /api/audit-report/users
  // ─────────────────────────────────────────────────────────────────────────
  const fetchDistinctUsers = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/audit-report/users');
      // Response may be a plain array or { data: [...] } — handle both
      const users = res.data?.users || [];
      setDistinctUsers(users);
    } catch (err) {
      console.error('Failed to fetch distinct users:', err);
      // Non-critical — silently ignore
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch report rows
  // GET /api/audit-report/combined-report
  //   Query params: start_date, end_date, user_name, persona, opco, limit, offset
  // ─────────────────────────────────────────────────────────────────────────
  const fetchReport = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setError(null);

    try {
      if (!fromDate || !toDate) throw new Error('Please select both start and end dates');
      if (new Date(fromDate) > new Date(toDate)) throw new Error('Start date cannot be after end date');

      const params = buildParams({
        start_date: fromDate,
        end_date:   toDate,
        user_name:  selectedUser   || undefined,
        persona:    selectedPersona || undefined,
        opco:       selectedOpco   || undefined,
        limit:      ITEMS_PER_PAGE,
        offset:     newOffset,
      });

      const res = await apiClient.get(`/api/audit-report/combined-report?${params}`);

      // Response may be a plain array or { data: [...] } — handle both
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];

      setTableData((prev) => (newOffset === 0 ? rows : [...prev, ...rows]));
      setHasMore(rows.length === ITEMS_PER_PAGE);
      setOffset(newOffset);
    } catch (err) {
      const msg = err?.response?.data?.detail?.[0]?.msg || err.message || 'Failed to load data';
      setError(msg);
      if (newOffset === 0) setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedUser, selectedPersona, selectedOpco]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDistinctUsers();
    fetchReport(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply filters ─────────────────────────────────────────────────────────
  const handleApply = () => {
    setOffset(0);
    fetchReport(0);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSearchTerm('');
    setSelectedUser('');
    setSelectedOpco('');
    setSelectedPersona('');
    setFromDate(minus30Str());
    setToDate(todayStr());
    setOffset(0);
    // fetchReport will be called with stale closured state, so we manually
    // trigger it via a slight delay after state settles, OR just let user
    // click Apply. For UX convenience we call it directly with defaults:
    setTableData([]);
    setError(null);
    // Note: Because useState setters are async, we call fetch with explicit
    // defaults here rather than relying on updated state:
    (async () => {
      setLoading(true);
      try {
        const params = buildParams({
          start_date: minus30Str(),
          end_date:   todayStr(),
          limit:      ITEMS_PER_PAGE,
          offset:     0,
        });
        const res = await apiClient.get(`/api/audit-report/combined-report?${params}`);
        const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setTableData(rows);
        setHasMore(rows.length === ITEMS_PER_PAGE);
        setOffset(0);
      } catch (err) {
        setError(err?.response?.data?.detail?.[0]?.msg || err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  };

  // ── Load more (server-side pagination) ────────────────────────────────────
  const handleLoadMore = () => {
    fetchReport(offset + ITEMS_PER_PAGE);
  };

  // ── Client-side search across loaded rows ──────────────────────────────────
  const displayData = useMemo(() => {
    if (!searchTerm.trim()) return tableData;
    const q = searchTerm.toLowerCase();
    return tableData.filter((row) =>
      Object.values(row).some((v) => v && String(v).toLowerCase().includes(q))
    );
  }, [searchTerm, tableData]);

  // ── Export visible rows to CSV ────────────────────────────────────────────
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

          {/* ── Filter panel ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 items-end">

              {/* Search (client-side across loaded rows) */}
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
                  type="date"
                  value={fromDate}
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
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-[#174a7e] focus:border-[#174a7e] outline-none"
                />
              </div>

              {/* User Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <Filter size={11} className="inline mr-1" />User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-[#174a7e] focus:border-[#174a7e] outline-none"
                >
                  <option value="">All Users</option>
                  {distinctUsers.map((u, i) => (
                    <option key={i} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* OPCO */}
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

              {/* Persona */}
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

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleApply}
                  disabled={loading || !fromDate || !toDate}
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

            {/* Row count bar */}
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-500">
                {loading
                  ? 'Loading…'
                  : `${displayData.length} row${displayData.length !== 1 ? 's' : ''} displayed`}
              </p>
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
                        No records found. Try adjusting your filters.
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
                            ) : (col.key === 'ai_response' || col.key === 'query' || col.key === 'citations') ? (
                              <span title={row[col.key] ?? ''} className="text-xs">
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

            {/* ── Load more ────────────────────────────────────────────── */}
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

            {/* Loading more indicator */}
            {loading && displayData.length > 0 && (
              <div className="flex justify-center items-center py-4 border-t border-gray-100 gap-2">
                <Loader2 size={18} className="animate-spin text-[#174a7e]" />
                <span className="text-sm text-gray-500">Loading more…</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Report;
