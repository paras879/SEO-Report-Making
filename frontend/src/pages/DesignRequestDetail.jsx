import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function DesignRequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [events, setEvents] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Actions state
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [forwardMessage, setForwardMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [qaMessage, setQaMessage] = useState('');
  const [resolveMessage, setResolveMessage] = useState('');
  const [hoursSpent, setHoursSpent] = useState('');
  const [reopenMessage, setReopenMessage] = useState('');
  const [rejectMessage, setRejectMessage] = useState('');

  const [activeModal, setActiveModal] = useState(null); // 'qa' | 'resolve' | 'reopen' | 'reject' | null

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/design-requests/${id}`);
      if (res.data.success) {
        setRequest(res.data.request);
        setEvents(res.data.events || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const loadDesigners = async () => {
    if (['team_lead', 'admin', 'super_admin'].includes(user.role)) {
      try {
        const res = await api.get('/design-requests/designers');
        if (res.data.success) {
          setDesigners(res.data.designers || []);
        }
      } catch (err) {
        console.error('Failed to load designers', err);
      }
    }
  };

  useEffect(() => {
    loadData();
    loadDesigners();
  }, [id]);

  // Forward to Designer
  const handleForward = async (e) => {
    e.preventDefault();
    if (!selectedDesigner) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/design-requests/${id}/forward`, {
        designer_id: selectedDesigner,
        message: forwardMessage,
      });
      if (res.data.success) {
        setForwardMessage('');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign designer');
    } finally {
      setActionLoading(false);
    }
  };

  // Designer Start Progress
  const handleStartProgress = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/design-requests/${id}/start-progress`, { message: 'Started working on visuals 🎨' });
      if (res.data.success) loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start progress');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit QA
  const handleSubmitQA = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post(`/design-requests/${id}/submit-qa`, {
        message: qaMessage,
        hours_spent: Number(hoursSpent) || 0,
      });
      if (res.data.success) {
        setActiveModal(null);
        setQaMessage('');
        setHoursSpent('');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit for QA');
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve
  const handleResolve = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post(`/design-requests/${id}/resolve`, {
        message: resolveMessage,
        hours_spent: Number(hoursSpent) || 0,
      });
      if (res.data.success) {
        setActiveModal(null);
        setResolveMessage('');
        setHoursSpent('');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve request');
    } finally {
      setActionLoading(false);
    }
  };

  // Reopen
  const handleReopen = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post(`/design-requests/${id}/reopen`, { message: reopenMessage });
      if (res.data.success) {
        setActiveModal(null);
        setReopenMessage('');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reopen');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject / Return
  const handleReject = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post(`/design-requests/${id}/reject`, { message: rejectMessage });
      if (res.data.success) {
        setActiveModal(null);
        setRejectMessage('');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to return request');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/design-requests/${id}/comments`, { message: commentText });
      if (res.data.success) {
        setCommentText('');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-medium">Loading details...</div>;
  if (error || !request) return <div className="p-10 text-center text-red-500 font-semibold">{error || 'Request not found'}</div>;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Link to="/design-requests" className="text-slate-400 hover:text-slate-600 text-xs font-semibold">
              ← Back to Editor Requests
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {request.title || `${request.category} Request`}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                #{request.id}
              </span>
              <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                Category: {request.category}
              </span>
              {request.blog_category && (
                <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-indigo-200">
                  Blog Category: {request.blog_category}
                </span>
              )}
              <span className="bg-amber-50 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-200 uppercase">
                {request.priority} Priority
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status</span>
            <span className="bg-brand-50 text-brand-700 border border-brand-200 font-bold px-3 py-1 rounded-full text-xs">
              {request.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Keywords */}
          {request.keywords && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {request.keywords.split(',').map((kw, i) => (
                  <span key={i} className="bg-slate-100 text-slate-800 border border-slate-200 font-mono text-xs px-3 py-1 rounded-xl">
                    🔑 {kw.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Specific Points to Include */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Specific Points & Requirements</h3>
            {request.points_to_include ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 font-sans text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {request.points_to_include}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No specific instructions provided.</p>
            )}
          </div>

          {/* Reference Screenshots / Attachments */}
          {Array.isArray(request.attachments) && request.attachments.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Reference Images & Attachments</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {request.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:opacity-90 transition-opacity"
                  >
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="w-full aspect-video object-cover" />
                    ) : (
                      <div className="p-3 text-xs font-semibold text-slate-700 truncate">📄 {att.name}</div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Activity History & Comment Thread */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Activity Timeline & Discussion</h3>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {events.map((ev) => (
                <div key={ev.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-bold text-slate-900">{ev.actor_name || 'System'} ({ev.actor_role})</span>
                    <span className="text-[10px]">{new Date(ev.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{ev.message}</p>
                </div>
              ))}
            </div>

            {/* Comment Box */}
            <form onSubmit={handleAddComment} className="pt-2 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment or update..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Comment
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Actions & Info (1 col) */}
        <div className="space-y-6">
          {/* Action Control Panel */}
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Workflow Actions</h3>

          {/* Assign Editor (TL / Admin) */}
          {['team_lead', 'admin', 'super_admin'].includes(user.role) && request.status !== 'resolved' && (
            <form onSubmit={handleForward} className="space-y-2 border-b border-slate-100 pb-4">
              <label className="block text-xs font-semibold text-slate-700">Assign to Editor</label>
              <select
                value={selectedDesigner}
                onChange={(e) => setSelectedDesigner(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              >
                <option value="">Select Editor...</option>
                {designers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} (@{d.username})</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!selectedDesigner || actionLoading}
                className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
              >
                Assign Editor
              </button>
            </form>
          )}

          {/* Editor Start Progress */}
          {(user.role === 'designer' || ['admin', 'super_admin'].includes(user.role)) && request.status === 'forwarded' && (
            <button
              onClick={handleStartProgress}
              disabled={actionLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
            >
              ✍️ Start Working On Visuals
            </button>
          )}

          {/* Designer Submit for Review */}
          {(user.role === 'designer' || ['admin', 'super_admin'].includes(user.role)) && ['in_progress', 'reopened'].includes(request.status) && (
            <button
              onClick={() => setActiveModal('qa')}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md"
            >
              🔍 Submit Designs for QA / Review
            </button>
          )}

          {/* Resolve / Complete Request */}
          {request.status !== 'resolved' && (
            <button
              onClick={() => setActiveModal('resolve')}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
            >
              ✅ Mark as Completed
            </button>
          )}

          {/* Reopen Request */}
          {request.status === 'resolved' && (
            <button
              onClick={() => setActiveModal('reopen')}
              className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md"
            >
              🔄 Re-open Request
            </button>
          )}

          {/* Delete Request (Creator / TL / Admin) */}
          {(request.employee_id === user.id || ['admin', 'super_admin', 'team_lead'].includes(user.role)) && (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Are you sure you want to delete this design request permanently?')) return;
                setActionLoading(true);
                try {
                  const res = await api.delete(`/design-requests/${id}`);
                  if (res.data.success) {
                    navigate('/design-requests');
                  } else {
                    alert(res.data.message || 'Failed to delete request');
                  }
                } catch (err) {
                  alert(err.response?.data?.message || 'Failed to delete request');
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-bold text-xs border border-rose-200 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <span>🗑️</span> Delete Request
            </button>
          )}
        </div>

        {/* Request Metadata Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Ticket Info</h3>
          <div className="flex justify-between text-slate-600">
            <span>Raised By:</span>
            <span className="font-semibold text-slate-900">{request.employee_name}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Team Lead:</span>
            <span className="font-semibold text-slate-900">{request.team_lead_name || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Editor:</span>
            <span className="font-semibold text-indigo-600">{request.designer_name || 'Unassigned'}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Hours Logged:</span>
            <span className="font-semibold text-slate-900">{request.hours_spent} hrs</span>
          </div>
          {request.due_date && (
            <div className="flex justify-between text-slate-600">
              <span>Due Date:</span>
              <span className="font-semibold text-rose-600">{new Date(request.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* QA Modal */}
      {activeModal === 'qa' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleSubmitQA} className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Submit Work for Review</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Asset Link</label>
              <textarea
                rows={3}
                required
                value={qaMessage}
                onChange={(e) => setQaMessage(e.target.value)}
                placeholder="e.g. Uploaded all 3 blog visual banners in Figma / Google Drive..."
                className="w-full p-3 rounded-xl border text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hours Spent</label>
              <input
                type="number"
                step="0.5"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-full p-2.5 rounded-xl border text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={actionLoading} className="px-4 py-2 text-xs font-bold bg-purple-600 text-white rounded-xl">Submit</button>
            </div>
          </form>
        </div>
      )}

      {/* Resolve Modal */}
      {activeModal === 'resolve' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleResolve} className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Mark Editor Request Completed</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Summary</label>
              <textarea
                rows={3}
                required
                value={resolveMessage}
                onChange={(e) => setResolveMessage(e.target.value)}
                placeholder="e.g. Final blog graphics approved and exported in high resolution."
                className="w-full p-3 rounded-xl border text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={actionLoading} className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl">Complete</button>
            </div>
          </form>
        </div>
      )}

      {/* Reopen Modal */}
      {activeModal === 'reopen' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleReopen} className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Re-open Request</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Re-opening</label>
              <textarea
                rows={3}
                required
                value={reopenMessage}
                onChange={(e) => setReopenMessage(e.target.value)}
                placeholder="e.g. Need additional infographic banner for section 2..."
                className="w-full p-3 rounded-xl border text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button type="submit" disabled={actionLoading} className="px-4 py-2 text-xs font-bold bg-orange-600 text-white rounded-xl">Reopen</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
