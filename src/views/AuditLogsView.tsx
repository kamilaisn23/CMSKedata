import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Eye, X, Clock, User, ArrowLeft, ArrowRight } from 'lucide-react';
import { Site } from '../components/Navbar';
import { useToast } from '../components/Toast';

interface AuditLogItem {
  id: string;
  siteId?: string;
  actor: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export const AuditLogsView: React.FC<{ activeSite: Site | null }> = ({ activeSite }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterAction, setFilterAction] = useState('ALL');
  const [scopeSiteOnly, setScopeSiteOnly] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    loadLogs();
  }, [page, filterAction, scopeSiteOnly, activeSite]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/audit-logs?page=${page}&perPage=15`;
      if (filterAction !== 'ALL') url += `&action=${filterAction}`;
      if (scopeSiteOnly && activeSite) url += `&siteId=${activeSite.id}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.data) {
        setLogs(json.data);
        if (json.meta) {
          setTotalPages(json.meta.totalPages || 1);
          setTotalCount(json.meta.total || 0);
        }
      }
    } catch {
      showToast('Gagal memuat catatan audit log', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      case 'RESTORE_VERSION':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300';
      case 'LOGIN':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="cms-page p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
            Audit Log Sistem
          </h1>
          <p className="text-[13px] text-slate-500">
            Jejak aktivitas keamanan, perubahan konten, versi snapshot, dan operasi administratif
          </p>
        </div>

        <div className="text-[13px] font-semibold text-slate-500">
          Total: <strong className="text-slate-800 dark:text-slate-100">{totalCount}</strong> catatan
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] cms-filter-bar rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-[#6C7A89]" />
          <select aria-label="Tipe aktivitas"
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(1);
            }}
            className="text-[13px] bg-slate-50 dark:bg-[#282E35] border border-slate-200 dark:border-[#3E4651] text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
          >
            <option value="ALL">Semua Tipe Aksi</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="RESTORE_VERSION">RESTORE_VERSION</option>
            <option value="REGENERATE_API_KEY">REGENERATE_API_KEY</option>
            <option value="LOGIN">LOGIN</option>
          </select>

          {activeSite && (
            <label className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={scopeSiteOnly}
                onChange={(e) => {
                  setScopeSiteOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-slate-300 text-[#6C7A89] focus:ring-[#6C7A89]"
              />
              <span>Hanya untuk situs aktif ({activeSite.name})</span>
            </label>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg  overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-[#FFFFFF] dark:bg-[#282E35] border-b border-slate-200 dark:border-[#3E4651] text-slate-500 font-medium">
                <th className="p-3.5">Waktu</th>
                <th className="p-3.5">Aktor</th>
                <th className="p-3.5">Aksi</th>
                <th className="p-3.5">Entitas</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Memuat catatan audit...
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Tidak ada catatan audit yang cocok.
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#282E35]/50 transition">
                    <td className="p-3.5 text-slate-500 font-mono text-[13px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {log.actor}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[13px] font-medium ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono text-[13px]">
                      {log.entityType} {log.entityId && `(${log.entityId.slice(0, 10)}...)`}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[13px]">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2 py-1 text-slate-500 hover:text-[#6C7A89] hover:bg-slate-100 dark:hover:bg-[#282E35] rounded-md transition text-[13px] font-semibold"
                      >
                        Lihat JSON
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-[#FFFFFF] dark:bg-[#1A1E22] flex items-center justify-between text-[13px] text-slate-500">
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#282E35] disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#282E35] disabled:opacity-30"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Details JSON Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#3E4651] rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-medium text-base text-slate-800 dark:text-slate-100">
                Detail Catatan Audit
              </h3>
              <button onClick={() => setSelectedLog(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="text-[13px] flex flex-col gap-2 text-slate-600 dark:text-slate-300">
              <div><strong>Aksi:</strong> {selectedLog.action}</div>
              <div><strong>Aktor:</strong> {selectedLog.actor}</div>
              <div><strong>Entitas:</strong> {selectedLog.entityType} ({selectedLog.entityId || 'N/A'})</div>
              <div><strong>Waktu:</strong> {new Date(selectedLog.createdAt).toISOString()}</div>
              <div><strong>IP:</strong> {selectedLog.ipAddress || 'unknown'}</div>
            </div>

            <div>
              <span className="text-[13px] font-medium text-slate-500 block mb-1">
                Data Perubahan (JSON Payload):
              </span>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[13px] font-mono max-h-60 overflow-y-auto">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
                  } catch {
                    return selectedLog.details;
                  }
                })()}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
