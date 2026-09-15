import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { PRIORITY_OPTIONS } from '../constants';

const EMPTY = {
  title: '', report_date: new Date().toISOString().slice(0, 10), priority: 'medium',
  task_done: '', hours_worked: '', work_status: 'in-progress', remarks: '',
  challenges: '', next_day_plan: '',
  keywords: '', backlinks_created: 0, onpage_work: '', offpage_work: '', ranking_change: '',
  client_name: '', project_name: '', website_url: '',
};

export default function ReportForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      api.get(`/reports/${id}`).then((r) => {
        const rep = r.data.report;
        setForm({ ...EMPTY, ...rep, report_date: rep.report_date?.slice(0, 10) });
      }).catch((e) => setErr(e.response?.data?.message || 'Failed to load report for editing'));
    }
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const uploadFiles = async (reportId) => {
    if (files.length === 0) return;
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    await api.post(`/reports/${reportId}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  };

  const save = async (submit) => {
    setErr(''); setSaving(true);
    try {
      const payload = { ...form, backlinks_created: Number(form.backlinks_created) || 0, hours_worked: form.hours_worked || null };
      let reportId = id;
      if (editing) {
        await api.patch(`/reports/${id}`, payload);
        await uploadFiles(id);
        if (submit) await api.post(`/reports/${id}/submit`);
      } else {
        const { data } = await api.post('/reports', { ...payload, submit: false });
        reportId = data.report.id;
        await uploadFiles(reportId);
        if (submit) await api.post(`/reports/${reportId}/submit`);
      }
      navigate(`/reports/${reportId}`);
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.errors?.[0]?.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-card"
        >
          <span>←</span>
          <span>Back</span>
        </button>
        <span className="text-xs font-semibold text-slate-400">
          {editing ? 'Editing Existing Record' : 'Step: Draft Creation'}
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          {editing ? 'Edit Daily SEO Report' : 'Create Daily SEO Report'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Document your deliverables, campaign metrics, rankings, and notes for review by your Team Lead.
        </p>
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Section 1: Basic Work */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
            01
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Basic Work & Progress</h2>
            <p className="text-[11px] text-slate-400">Core operational deliverables and daily time allocation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="label">Report Title *</label>
            <input
              className="input font-semibold"
              placeholder="e.g. SEO Campaign Updates & On-Page Audit for Client X"
              value={form.title}
              onChange={set('title')}
              required
            />
          </div>

          <div>
            <label className="label">Report Date</label>
            <input
              type="date"
              className="input"
              value={form.report_date}
              onChange={set('report_date')}
            />
          </div>

          <div>
            <label className="label">Hours Worked</label>
            <input
              type="number"
              step="0.5"
              className="input"
              placeholder="e.g. 8.0"
              value={form.hours_worked}
              onChange={set('hours_worked')}
            />
          </div>

          <div>
            <label className="label">Work Status</label>
            <select className="input font-medium" value={form.work_status} onChange={set('work_status')}>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="label">Priority Level</label>
            <select className="input font-medium" value={form.priority} onChange={set('priority')}>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} Priority
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="label">Work Done Today</label>
            <textarea
              className="input min-h-[90px]"
              rows="3"
              value={form.task_done}
              onChange={set('task_done')}
              placeholder="Detail the exact tasks, pages updated, or optimization procedures conducted..."
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <label className="label">Problems / Blockers Encountered</label>
            <textarea
              className="input border-amber-200 focus:border-amber-400 focus:ring-amber-100 min-h-[80px]"
              rows="2"
              value={form.challenges}
              onChange={set('challenges')}
              placeholder="Any access issues, CMS errors, or dependency blockers you need assistance with..."
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <label className="label">Next Day Action Plan</label>
            <textarea
              className="input border-blue-200 focus:border-blue-400 focus:ring-blue-100 min-h-[80px]"
              rows="2"
              value={form.next_day_plan}
              onChange={set('next_day_plan')}
              placeholder="Priority tasks scheduled for the next working day..."
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="label">Additional Remarks</label>
            <textarea
              className="input"
              rows="2"
              value={form.remarks}
              onChange={set('remarks')}
              placeholder="Any additional context or notes for the reviewer..."
            />
          </div>
        </div>
      </div>

      {/* Section 2: SEO Metrics */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            02
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">SEO & Deliverable Metrics</h2>
            <p className="text-[11px] text-slate-400">Quantitative keyword, ranking, and link building outputs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="label">Keywords Worked On</label>
            <input
              className="input"
              value={form.keywords}
              onChange={set('keywords')}
              placeholder="e.g. best dental clinic, teeth whitening near me (comma separated)"
            />
          </div>

          <div className="sm:col-span-1 lg:col-span-2">
            <label className="label">Backlinks Created (Count)</label>
            <input
              type="number"
              className="input"
              value={form.backlinks_created}
              onChange={set('backlinks_created')}
              placeholder="0"
            />
          </div>

          <div className="sm:col-span-1 lg:col-span-2">
            <label className="label">Ranking Change</label>
            <input
              className="input"
              value={form.ranking_change}
              onChange={set('ranking_change')}
              placeholder="e.g. +4 (from #12 to #8) or Stable"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <label className="label">On-Page Optimizations</label>
            <textarea
              className="input min-h-[80px]"
              rows="2"
              value={form.onpage_work}
              onChange={set('onpage_work')}
              placeholder="Meta titles, H1 structure, internal linking, schema markup..."
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <label className="label">Off-Page Activities</label>
            <textarea
              className="input min-h-[80px]"
              rows="2"
              value={form.offpage_work}
              onChange={set('offpage_work')}
              placeholder="Guest posting, citation building, Web 2.0, directory submissions..."
            />
          </div>
        </div>
      </div>

      {/* Section 3: Client / Project */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            03
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Client & Campaign Context</h2>
            <p className="text-[11px] text-slate-400">Account metadata for reporting filters and audits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-1 lg:col-span-2">
            <label className="label">Client Name</label>
            <input
              className="input"
              value={form.client_name}
              onChange={set('client_name')}
              placeholder="e.g. Apex Health Solutions"
            />
          </div>

          <div className="sm:col-span-1 lg:col-span-2">
            <label className="label">Project / Campaign</label>
            <input
              className="input"
              value={form.project_name}
              onChange={set('project_name')}
              placeholder="e.g. Q3 Organic Growth"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="label">Website Target URL</label>
            <input
              className="input"
              value={form.website_url}
              onChange={set('website_url')}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Attachments */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
            04
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Proof of Work Attachments</h2>
            <p className="text-[11px] text-slate-400">Upload ranking screenshots, Ahrefs/Semrush exports, or PDFs (max 5)</p>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50 hover:bg-white cursor-pointer relative">
          <input
            type="file"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])}
          />
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl mb-2">
              📎
            </div>
            <p className="text-xs font-bold text-slate-700">Click or drag & drop files here to attach</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Supports PNG, JPG, PDF, Excel, CSV</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {files.length} file{files.length > 1 ? 's' : ''} queued for upload:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs shadow-sm"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-700 truncate">{f.name}</p>
                    <p className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-1 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Ready to proceed?</p>
          <p>Saving as Draft lets you continue editing anytime.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            className="btn-secondary flex-1 sm:flex-none text-xs"
            disabled={saving}
            onClick={() => save(false)}
          >
            {saving ? 'Saving...' : '💾 Save as Draft'}
          </button>

          <button
            type="button"
            className="btn-primary flex-1 sm:flex-none text-xs"
            disabled={saving}
            onClick={() => save(true)}
          >
            {saving ? 'Processing...' : '🚀 Submit to Team Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
