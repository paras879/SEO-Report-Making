import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import DateRangeFilter from '../components/DateRangeFilter';

export default function SupervisorConsole() {
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'tickets' | 'team'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stats & Team data
  const [stats, setStats] = useState(null);
  const [files, setFiles] = useState([]);
  const [team, setTeam] = useState({ developers: [], editors: [], employees: [] });
  const [tickets, setTickets] = useState({ dev: [], design: [], reports: [] });

  // Filters
  const [fileSearch, setFileSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('all'); // 'all' | 'high'

  const [dateFilter, setDateFilter] = useState({ range: 'all', from: '', to: '' });
  const [commentTicket, setCommentTicket] = useState(null);
  const [commentMsg, setCommentMsg] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState('');

  useEffect(() => {
    fetchSupervisorData();
  }, [dateFilter]);

  const fetchSupervisorData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFilter.from) params.set('from', dateFilter.from);
      if (dateFilter.to) params.set('to', dateFilter.to);
      const q = params.toString() ? `?${params.toString()}` : '';

      const [statsRes, filesRes, teamRes, devRes, designRes, reportsRes] = await Promise.all([
        api.get('/dashboard/stats').catch(() => ({ data: {} })),
        api.get('/supervisor/files').catch(() => ({ data: { files: [] } })),
        api.get('/supervisor/team-overview').catch(() => ({ data: { developers: [], editors: [], employees: [] } })),
        api.get(`/dev-requests${q}`).catch(() => ({ data: { requests: [] } })),
        api.get(`/design-requests${q}`).catch(() => ({ data: { requests: [] } })),
        api.get(`/reports${q}`).catch(() => ({ data: { reports: [] } })),
      ]);

      setStats(statsRes.data?.summary || null);
      setFiles(filesRes.data?.files || []);
      setTeam(teamRes.data || { developers: [], editors: [], employees: [] });
      setTickets({
        dev: devRes.data?.requests || [],
        design: designRes.data?.requests || [],
        reports: reportsRes.data?.reports || [],
      });
    } catch (err) {
      console.error('Failed to load supervisor data:', err);
      setError('Supervisor data load karne me error aaya.');
    } finally {
      setLoading(false);
    }
  };

  // Counts for File Hub Format Pills
  const pdfCount = files.filter((f) => f.file_type?.toLowerCase().includes('pdf')).length;
  const imageCount = files.filter((f) => f.file_type?.toLowerCase().includes('image') || f.file_type?.toLowerCase().includes('png') || f.file_type?.toLowerCase().includes('jpg') || f.file_type?.toLowerCase().includes('jpeg')).length;
  const csvCount = files.filter((f) => f.file_type?.toLowerCase().includes('csv') || f.file_type?.toLowerCase().includes('sheet') || f.file_type?.toLowerCase().includes('excel')).length;

  // Filtered files by search, type, and date range
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.file_name.toLowerCase().includes(fileSearch.toLowerCase()) ||
      f.uploaded_by_name?.toLowerCase().includes(fileSearch.toLowerCase()) ||
      f.associated_title?.toLowerCase().includes(fileSearch.toLowerCase()) ||
      f.module?.toLowerCase().includes(fileSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (fileTypeFilter === 'pdf' && !f.file_type?.toLowerCase().includes('pdf')) return false;
    if (fileTypeFilter === 'image' && (!f.file_type?.toLowerCase().includes('image') && !f.file_type?.toLowerCase().includes('png') && !f.file_type?.toLowerCase().includes('jpg') && !f.file_type?.toLowerCase().includes('jpeg'))) return false;
    if (fileTypeFilter === 'csv' && (!f.file_type?.toLowerCase().includes('csv') && !f.file_type?.toLowerCase().includes('sheet') && !f.file_type?.toLowerCase().includes('excel'))) return false;

    if (dateFilter.from && f.created_at) {
      const createdStr = new Date(f.created_at).toISOString().slice(0, 10);
      if (createdStr < dateFilter.from) return false;
    }
    if (dateFilter.to && f.created_at) {
      const createdStr = new Date(f.created_at).toISOString().slice(0, 10);
      if (createdStr > dateFilter.to) return false;
    }

    return true;
  });

  // Combine all tickets for unified view
  const unifiedTickets = [
    ...tickets.dev.map((d) => ({
      id: d.id,
      title: d.title,
      type: 'Dev Request',
      module: 'dev',
      status: d.status,
      priority: d.priority,
      created_by: d.employee_name || 'Employee',
      assigned_to: d.developer_name || 'Unassigned',
      created_at: d.created_at,
      link: `/dev-requests/${d.id}`,
    })),
    ...tickets.design.map((ds) => ({
      id: ds.id,
      title: ds.title,
      type: 'Editor Request',
      module: 'editor',
      status: ds.status,
      priority: ds.priority,
      created_by: ds.employee_name || 'Employee',
      assigned_to: ds.designer_name || 'Unassigned',
      created_at: ds.created_at,
      link: `/design-requests/${ds.id}`,
    })),
    ...tickets.reports.map((r) => ({
      id: r.id,
      title: r.title,
      type: 'SEO Report',
      module: 'report',
      status: r.status,
      priority: 'medium',
      created_by: r.employee_name || 'Employee',
      assigned_to: r.team_lead_name || 'Team Lead',
      created_at: r.created_at,
      link: `/reports/${r.id}`,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // High priority urgent blockers
  const urgentBlockers = unifiedTickets.filter((t) => t.priority === 'high' && t.status !== 'resolved' && t.status !== 'admin_approved');

  const filteredTickets = unifiedTickets.filter((t) => {
    const matchesSearch =
      ticketSearch === '' ||
      t.title.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.created_by.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.assigned_to.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.type.toLowerCase().includes(ticketSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (ticketStatusFilter !== 'all' && t.status !== ticketStatusFilter) return false;
    if (ticketPriorityFilter !== 'all' && t.priority !== ticketPriorityFilter) return false;

    if (dateFilter.from && t.created_at) {
      const createdStr = new Date(t.created_at).toISOString().slice(0, 10);
      if (createdStr < dateFilter.from) return false;
    }
    if (dateFilter.to && t.created_at) {
      const createdStr = new Date(t.created_at).toISOString().slice(0, 10);
      if (createdStr > dateFilter.to) return false;
    }

    return true;
  });

  const handlePostSupervisoryNote = async (e) => {
    e.preventDefault();
    if (!commentMsg.trim() || !commentTicket) return;
    setSubmittingComment(true);
    setCommentSuccess('');
    try {
      const endpoint =
        commentTicket.module === 'dev'
          ? `/dev-requests/${commentTicket.id}/comments`
          : commentTicket.module === 'editor'
          ? `/design-requests/${commentTicket.id}/comments`
          : `/reports/${commentTicket.id}/comment`;

      await api.post(endpoint, { comment: `👑 Supervisor Guidance: ${commentMsg.trim()}`, message: `👑 Supervisor Guidance: ${commentMsg.trim()}` });
      setCommentSuccess('Guidance comment posted successfully!');
      setTimeout(() => {
        setCommentTicket(null);
        setCommentMsg('');
        setCommentSuccess('');
      }, 1200);
      fetchSupervisorData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post supervisory comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
      case 'completed':
      case 'admin_approved':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✅ Completed / Approved</span>;
      case 'in_progress':
      case 'forwarded':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">⚡ In Progress</span>;
      case 'submitted':
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">⏳ Pending Review</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/20">{status}</span>;
    }
  };

  const getFileIcon = (fileType = '') => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return '📄';
    if (type.includes('image') || type.includes('png') || type.includes('jpg')) return '🖼️';
    if (type.includes('csv') || type.includes('sheet') || type.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Supervisor Command Center
              </span>
              <span className="text-xs font-semibold text-slate-400">Live Team & File Oversight</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Team Workload & Document Oversight
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-400 max-w-2xl">
              Sabhi Developers, Editors & Employees ke kaam, tickets, comments or sent PDF/files ko yha se supervisor real-time monitor or verify kar sakte hain.
            </p>
          </div>

          <button
            onClick={fetchSupervisorData}
            className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all shadow-md flex items-center gap-2"
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Quick KPI Strip */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 backdrop-blur border border-slate-800 rounded-xl p-3.5">
            <span className="text-xs font-semibold text-slate-400 block">Total Open Tickets</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">
              {(Number(stats?.open_dev_tickets) || 0) + (Number(stats?.open_design_tickets) || 0)}
            </span>
          </div>

          <div className="bg-slate-950/60 backdrop-blur border border-slate-800 rounded-xl p-3.5">
            <span className="text-xs font-semibold text-slate-400 block">Total Resolved Tickets</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">
              {(Number(stats?.resolved_dev_tickets) || 0) + (Number(stats?.resolved_design_tickets) || 0)}
            </span>
          </div>

          <div className="bg-slate-950/60 backdrop-blur border border-slate-800 rounded-xl p-3.5">
            <span className="text-xs font-semibold text-slate-400 block">Files Shared & Sent</span>
            <span className="text-xl font-bold text-indigo-400 mt-1 block">{files.length}</span>
          </div>

          <div className="bg-slate-950/60 backdrop-blur border border-slate-800 rounded-xl p-3.5">
            <span className="text-xs font-semibold text-slate-400 block">Total SEO Reports</span>
            <span className="text-xl font-bold text-blue-400 mt-1 block">{stats?.total_reports || 0}</span>
          </div>
        </div>
      </div>

      {/* Urgent High Priority Blockers Alert Banner */}
      {urgentBlockers.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-rose-950/60 border border-rose-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xl font-bold shrink-0 animate-pulse">
              ⚠️
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Urgent High-Priority Tickets ({urgentBlockers.length})</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-extrabold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">Needs Attention</span>
              </h3>
              <p className="text-xs font-medium text-slate-300 mt-0.5">
                {urgentBlockers.map((b) => b.title).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('tickets');
              setTicketSearch('');
              setTicketPriorityFilter('high');
              setTimeout(() => {
                const el = document.getElementById('tickets-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all shrink-0"
          >
            Review Urgent Blockers ➔
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'files'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          📂 Shared Files & PDFs Hub ({files.length})
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'tickets'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          📋 All Work Tickets & Logs ({unifiedTickets.length})
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'team'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          👥 Team Workload & Productivity
        </button>
      </div>

      {/* Tab 1: Shared Files & PDFs Hub */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* Format Count Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFileTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                fileTypeFilter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              All Files ({files.length})
            </button>
            <button
              onClick={() => setFileTypeFilter('pdf')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                fileTypeFilter === 'pdf'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              📄 PDFs ({pdfCount})
            </button>
            <button
              onClick={() => setFileTypeFilter('image')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                fileTypeFilter === 'image'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              🖼️ Images ({imageCount})
            </button>
            <button
              onClick={() => setFileTypeFilter('csv')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                fileTypeFilter === 'csv'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              📊 CSVs ({csvCount})
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search files by name, uploader, or ticket title..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-400">Filter Type:</span>
              <select
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                className="py-2 px-3 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All File Types</option>
                <option value="pdf">PDF Documents</option>
                <option value="image">Images & Screenshots</option>
                <option value="csv">CSVs & Spreadsheets</option>
              </select>
            </div>
          </div>

          {/* Files List Table / Grid */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 font-semibold">Files load ho rhi hain...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <span className="text-4xl">📂</span>
              <p className="mt-2 text-sm font-semibold text-slate-300">Koi file ya document nahi mila</p>
              <p className="text-xs text-slate-500">Search criteria change karke dekhein.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Document / File Name</th>
                      <th className="px-5 py-3.5">Source Module</th>
                      <th className="px-5 py-3.5">Uploaded By</th>
                      <th className="px-5 py-3.5">Ticket / Report Title</th>
                      <th className="px-5 py-3.5">Date Uploaded</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl shrink-0">{getFileIcon(file.file_type)}</span>
                            <div>
                              <p className="font-bold text-white text-xs truncate max-w-xs">{file.file_name}</p>
                              <span className="text-[10px] text-slate-400 font-normal uppercase">{file.file_type || 'Attachment'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-bold">
                            {file.module}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-300">
                          👤 {file.uploaded_by_name || 'System User'}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-300 text-xs truncate max-w-xs">
                            {file.associated_title || 'General Attachment'}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-slate-400 font-normal">
                          {new Date(file.created_at).toLocaleDateString()} {new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {file.file_url ? (
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all"
                            >
                              ⬇️ Download / View
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">No URL</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Work Tickets & Logs */}
      {activeTab === 'tickets' && (
        <div id="tickets-section" className="space-y-4">
          {ticketPriorityFilter === 'high' && (
            <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 rounded-xl px-4 py-2.5">
              <span className="text-rose-400 font-bold text-xs">🔴 Showing High Priority Tickets Only</span>
              <button
                onClick={() => setTicketPriorityFilter('all')}
                className="ml-auto px-3 py-1 text-xs font-bold rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 transition-all"
              >
                ✕ Clear Priority Filter
              </button>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search ticket title, assignee, employee..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Priority:</span>
                <select
                  value={ticketPriorityFilter}
                  onChange={(e) => setTicketPriorityFilter(e.target.value)}
                  className="py-2 px-3 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">🔴 High Only</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Filter Status:</span>
                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value)}
                  className="py-2 px-3 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved / Completed</option>
                  <option value="forwarded">Forwarded</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_qa">Under QA Review</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Ticket Title & Module</th>
                    <th className="px-5 py-3.5">Raised By</th>
                    <th className="px-5 py-3.5">Assigned Developer/Editor</th>
                    <th className="px-5 py-3.5">Current Status</th>
                    <th className="px-5 py-3.5">Created Date</th>
                    <th className="px-5 py-3.5 text-right">Oversight Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredTickets.map((t) => (
                    <tr key={`${t.module}-${t.id}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-white text-xs flex items-center gap-1.5">
                            {t.title}
                            {t.priority === 'high' && (
                              <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">High</span>
                            )}
                          </p>
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                            {t.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        👤 {t.created_by}
                      </td>
                      <td className="px-5 py-4 text-indigo-300">
                        ⚡ {t.assigned_to}
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-normal">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => setCommentTicket(t)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-sm"
                        >
                          💬 Direct Note
                        </button>
                        <Link
                          to={t.link}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all"
                        >
                          👁️ View Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Team Workload & Productivity */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Developers Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-lg text-white flex items-center gap-2">
                🛠️ Developers Workload
              </h2>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-500/10 text-indigo-400">
                {team.developers.length} Active Developers
              </span>
            </div>

            {team.developers.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold py-4">No developer metrics found.</p>
            ) : (
              <div className="space-y-3">
                {team.developers.map((dev) => (
                  <div key={dev.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{dev.name}</p>
                      <p className="text-xs text-slate-400">{dev.email}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <div className="text-right">
                        <span className="text-amber-400 font-bold text-sm block">{dev.open_tickets || 0}</span>
                        <span className="text-[10px] text-slate-400">Open Tickets</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold text-sm block">{dev.resolved_tickets || 0}</span>
                        <span className="text-[10px] text-slate-400">Resolved</span>
                      </div>
                      <Link
                        to="/chat"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
                      >
                        💬 Chat
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editors Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-lg text-white flex items-center gap-2">
                🎨 Editors Workload
              </h2>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-500/10 text-indigo-400">
                {team.editors.length} Active Editors
              </span>
            </div>

            {team.editors.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold py-4">No editor metrics found.</p>
            ) : (
              <div className="space-y-3">
                {team.editors.map((editor) => (
                  <div key={editor.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{editor.name}</p>
                      <p className="text-xs text-slate-400">{editor.email}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <div className="text-right">
                        <span className="text-amber-400 font-bold text-sm block">{editor.open_tickets || 0}</span>
                        <span className="text-[10px] text-slate-400">Open Tickets</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold text-sm block">{editor.resolved_tickets || 0}</span>
                        <span className="text-[10px] text-slate-400">Resolved</span>
                      </div>
                      <Link
                        to="/chat"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
                      >
                        💬 Chat
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct Supervisory Guidance Comment Modal */}
      {commentTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <span>👑 Post Supervisory Guidance</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{commentTicket.title}</p>
              </div>
              <button
                onClick={() => setCommentTicket(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {commentSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {commentSuccess}
              </div>
            )}

            <form onSubmit={handlePostSupervisoryNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Guidance Note for {commentTicket.assigned_to} & {commentTicket.created_by}:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter supervisory instructions, priority guidelines, or review comments..."
                  value={commentMsg}
                  onChange={(e) => setCommentMsg(e.target.value)}
                  className="w-full p-3 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCommentTicket(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingComment}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submittingComment ? 'Posting...' : '👑 Send Guidance Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
