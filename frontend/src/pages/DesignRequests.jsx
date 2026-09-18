import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import DateRangeFilter from '../components/DateRangeFilter';

const STATUS_BADGES = {
  submitted: { label: 'Submitted', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  forwarded: { label: 'Assigned', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress 🎨', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' },
  under_qa: { label: 'Ready for Review 🔍', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  resolved: { label: 'Completed ✅', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  tl_rejected: { label: 'Returned ⚠️', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  reopened: { label: 'Re-opened 🔄', color: 'bg-orange-50 text-orange-700 border-orange-200' },
};

const PRIORITY_BADGES = {
  low: 'text-slate-500 bg-slate-100',
  medium: 'text-amber-700 bg-amber-100',
  high: 'text-rose-700 bg-rose-100',
  urgent: 'text-red-700 bg-red-200 font-extrabold animate-bounce',
};

export default function DesignRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [blogCategoryFilter, setBlogCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({ range: 'all', from: '', to: '' });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.set('status', statusFilter);
      if (categoryFilter) queryParams.set('category', categoryFilter);
      if (blogCategoryFilter) queryParams.set('blog_category', blogCategoryFilter);
      if (search) queryParams.set('search', search);
      if (dateFilter.from) queryParams.set('from', dateFilter.from);
      if (dateFilter.to) queryParams.set('to', dateFilter.to);

      const res = await api.get(`/design-requests?${queryParams.toString()}`);
      if (res.data.success) {
        setRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load design requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter, categoryFilter, blogCategoryFilter, dateFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadRequests();
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/design-requests/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `design-requests-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed. Please try again.');
    }
  };

  const handleDelete = async (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!window.confirm('Are you sure you want to delete this design request permanently?')) return;
    try {
      const res = await api.delete(`/design-requests/${id}`);
      if (res.data.success) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(res.data.message || 'Failed to delete request');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete request');
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
            <span className="p-2 rounded-2xl bg-brand-600/30 border border-brand-500/30 shadow-inner">✍️</span> Editor Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Manage graphic visuals, blog banners, On-Page graphics, video edits, and keyword asset requirements.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <span>📥</span> Export CSV / Excel
          </button>

          {/* Employee New Request */}
          {user.role === 'employee' && (
            <Link
              to="/design-requests/new"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-brand-900/30 transition-all flex items-center gap-2 shrink-0 transform hover:-translate-y-0.5"
            >
              <span>➕</span> New Request / CSV Upload
            </Link>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: '', label: 'All Requests' },
              { id: 'submitted', label: 'Submitted' },
              { id: 'forwarded', label: 'Assigned' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'under_qa', label: 'In Review' },
              { id: 'resolved', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 min-w-[240px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, keywords..."
              className="w-full px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Search
            </button>
          </form>
        </div>

        {/* Live Date Filter & Dropdown Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <DateRangeFilter onChange={setDateFilter} />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="On-Page">On-Page Graphic</option>
                <option value="Blog Request">Blog Request</option>
                <option value="Social Media / Infographics">Social Media / Infographic</option>
                <option value="Custom Graphic">Custom Graphic</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold">Blog Sub-Category:</span>
              <select
                value={blogCategoryFilter}
                onChange={(e) => setBlogCategoryFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none"
              >
                <option value="">All Blog Categories</option>
                <option value="Information">Information</option>
                <option value="Lexical">Lexical / Lyrical</option>
                <option value="Case Studies">Case Studies</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm animate-pulse">
            Loading editor requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <span className="text-4xl">✍️</span>
            <p className="font-semibold text-slate-700 text-sm">No editor requests found</p>
            <p className="text-xs text-slate-400">Try changing filters or submit a new editor request.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Title / Requirement</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Blog Sub-Category</th>
                  <th className="p-3.5">Keywords</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Employee / Editor</th>
                  <th className="p-3.5">Created</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {requests.map((r) => {
                  const statusInfo = STATUS_BADGES[r.status] || { label: r.status, color: 'bg-slate-100 text-slate-700' };
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-400">#{r.id}</td>
                      <td className="p-3.5">
                        <Link to={`/design-requests/${r.id}`} className="font-bold text-slate-900 hover:text-brand-600 block text-sm">
                          {r.title || `${r.category} Request`}
                        </Link>
                        {r.client_name && (
                          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                            Client: {r.client_name}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                          {r.category}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {r.blog_category ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                            {r.blog_category}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="p-3.5 max-w-[180px]">
                        {r.keywords ? (
                          <span className="truncate block font-mono text-slate-600" title={r.keywords}>
                            {r.keywords}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[10px] ${PRIORITY_BADGES[r.priority]}`}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded-full font-semibold border text-[11px] ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-800 font-semibold">{r.employee_name}</div>
                        {r.designer_name ? (
                          <div className="text-[10px] text-indigo-600 font-semibold">✍️ {r.designer_name}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400">Unassigned</div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 font-medium">
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        {['supervisor', 'admin', 'super_admin'].includes(user.role) && (
                          <Link
                            to={`/design-requests/${r.id}`}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Add direct supervisory note"
                          >
                            <span>💬</span> Direct Note
                          </Link>
                        )}
                        {(r.employee_id === user.id || ['admin', 'super_admin', 'team_lead'].includes(user.role)) && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(r.id, e)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-bold border border-rose-200 transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Delete request"
                          >
                            <span>🗑️</span> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
