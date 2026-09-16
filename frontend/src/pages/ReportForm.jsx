import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { PRIORITY_OPTIONS } from '../constants';

const DRAFT_KEY = 'seo_report_draft_v1';

const EMPTY = {
  title: '', report_date: new Date().toISOString().slice(0, 10), priority: 'medium',
  task_done: '', hours_worked: '', work_status: 'in-progress', remarks: '',
  challenges: '', next_day_plan: '',
  keywords: '', backlinks_created: 0, onpage_work: '', offpage_work: '', ranking_change: '',
  client_name: '', project_name: '', website_url: '',
  // ---- Website work + backlink types ----
  service_pages: '', blog_pages: '',
  backlinks_classified: 0, backlinks_guest_post: 0, backlinks_blog_post: 0, backlinks_article_post: 0,
  backlink_urls: '',
};

const BACKLINK_TYPE_OPTIONS = ['Classified', 'Guest Post', 'Blog Post', 'Article Post', 'Profile / Citation', 'Web 2.0', 'Other'];

export default function ReportForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [liveLinks, setLiveLinks] = useState([]);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkType, setBulkType] = useState('Classified');

  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [copyingLast, setCopyingLast] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  const isInitialMount = useRef(true);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // 1. Initial Load: Load report if editing, or restore local draft if creating
  useEffect(() => {
    if (editing) {
      api.get(`/reports/${id}`).then((r) => {
        const rep = r.data.report;
        setForm({ ...EMPTY, ...rep, report_date: rep.report_date?.slice(0, 10) });
        if (rep.backlink_urls) {
          try {
            const parsed = typeof rep.backlink_urls === 'string' ? JSON.parse(rep.backlink_urls) : rep.backlink_urls;
            if (Array.isArray(parsed)) setLiveLinks(parsed);
          } catch {}
        }
      }).catch((e) => setErr(e.response?.data?.message || 'Failed to load report for editing'));
    } else {
      // Check local storage draft
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.data && (parsed.data.title || parsed.data.task_done || parsed.data.keywords || parsed.data.service_pages)) {
            setForm(parsed.data);
            if (Array.isArray(parsed.liveLinks)) setLiveLinks(parsed.liveLinks);
            setDraftSavedAt(parsed.time || 'earlier today');
            setIsDraftRestored(true);
          }
        }
      } catch {}
    }
  }, [id, editing]);

  // 2. Auto-Save Draft to LocalStorage (when not editing an existing report)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!editing) {
      const hasContent = form.title || form.task_done || form.keywords || form.service_pages || form.blog_pages || liveLinks.length > 0;
      if (hasContent) {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: form, liveLinks, time: nowStr }));
        setDraftSavedAt(nowStr);
      }
    }
  }, [form, liveLinks, editing]);

  // 3. Ctrl + V Direct Screenshot Paste Handler
  useEffect(() => {
    const handlePaste = (e) => {
      // Don't intercept paste if user is typing text into normal inputs unless it's an image
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;

      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
            const file = new File([blob], `screenshot_${timeStr}.png`, { type: blob.type });
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        setFiles((prev) => [...prev, ...pastedFiles]);
        showToast(`📸 Attached ${pastedFiles.length} pasted screenshot${pastedFiles.length > 1 ? 's' : ''}!`);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const totalBacklinks =
    (Number(form.backlinks_classified) || 0) +
    (Number(form.backlinks_guest_post) || 0) +
    (Number(form.backlinks_blog_post) || 0) +
    (Number(form.backlinks_article_post) || 0);

  // Copy from Previous Report
  const copyPreviousReport = async () => {
    setCopyingLast(true);
    try {
      const res = await api.get('/reports', { params: { limit: 1 } });
      const list = res.data.reports || [];
      if (list.length === 0) {
        showToast('ℹ️ No previous reports found to copy.');
        return;
      }
      const last = list[0];
      const detailRes = await api.get(`/reports/${last.id}`);
      const r = detailRes.data.report;

      setForm((prev) => ({
        ...prev,
        title: r.title ? `${r.title}` : prev.title,
        keywords: r.keywords || prev.keywords,
        service_pages: r.service_pages || prev.service_pages,
        blog_pages: r.blog_pages || prev.blog_pages,
        client_name: r.client_name || prev.client_name,
        project_name: r.project_name || prev.project_name,
        website_url: r.website_url || prev.website_url,
      }));
      showToast('📋 Copied keywords, pages & client context from previous report!');
    } catch {
      showToast('⚠️ Could not copy previous report.');
    } finally {
      setCopyingLast(false);
    }
  };

  // Discard local draft
  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setForm(EMPTY);
    setLiveLinks([]);
    setIsDraftRestored(false);
    setDraftSavedAt(null);
    showToast('Draft discarded. Started with a fresh form.');
  };

  // 1-Click WhatsApp / Slack formatted update copy
  const copyWhatsAppSummary = () => {
    const dateFormatted = form.report_date || new Date().toISOString().slice(0, 10);
    const lines = [
      `📊 *Daily SEO Update — ${dateFormatted}*`,
      form.title ? `📝 *Title:* ${form.title}` : '',
      form.task_done ? `✅ *Work Done:* ${form.task_done}` : '',
      form.service_pages ? `🧩 *Service Pages:* ${form.service_pages}` : '',
      form.blog_pages ? `📝 *Blog Pages:* ${form.blog_pages}` : '',
      form.keywords ? `🎯 *Keywords:* ${form.keywords}` : '',
      `🔗 *Backlinks Created (${totalBacklinks} Total):*`,
      `   • Classified: ${form.backlinks_classified || 0}`,
      `   • Guest Post: ${form.backlinks_guest_post || 0}`,
      `   • Blog Post: ${form.backlinks_blog_post || 0}`,
      `   • Article Post: ${form.backlinks_article_post || 0}`,
    ];

    if (liveLinks.length > 0) {
      lines.push(`🌐 *Live Links Built (${liveLinks.length}):*`);
      liveLinks.slice(0, 5).forEach((l) => {
        lines.push(`   • ${l.url} ${l.anchor ? `(${l.anchor})` : ''}`);
      });
      if (liveLinks.length > 5) {
        lines.push(`   • ...and ${liveLinks.length - 5} more links`);
      }
    }

    if (form.remarks) lines.push(`📌 *Remarks:* ${form.remarks}`);

    const text = lines.filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    showToast('📲 WhatsApp client update copied to clipboard!');
  };

  // Live links management
  const addLiveLink = () => {
    setLiveLinks([...liveLinks, { url: '', anchor: '', type: 'Classified' }]);
  };

  const updateLiveLink = (index, key, val) => {
    const next = [...liveLinks];
    next[index][key] = val;
    setLiveLinks(next);
  };

  const removeLiveLink = (index) => {
    setLiveLinks(liveLinks.filter((_, i) => i !== index));
  };

  const handleBulkPasteLinks = () => {
    if (!bulkText.trim()) return;
    const rawUrls = bulkText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    const newRows = rawUrls.map((url) => ({
      url,
      anchor: '',
      type: bulkType,
    }));

    setLiveLinks([...liveLinks, ...newRows]);
    setBulkText('');
    setShowBulkPaste(false);
    showToast(`✅ Added ${newRows.length} live link URLs!`);
  };

  const uploadFiles = async (reportId) => {
    if (files.length === 0) return;
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    await api.post(`/reports/${reportId}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  };

  const save = async (submit) => {
    setErr(''); setSaving(true);
    try {
      const validLinks = liveLinks.filter((l) => l.url && l.url.trim());
      const payload = {
        ...form,
        hours_worked: form.hours_worked || null,
        backlink_urls: validLinks.length > 0 ? JSON.stringify(validLinks) : null,
      };

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

      // Clear local storage draft after successful save/submit
      localStorage.removeItem(DRAFT_KEY);
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
    <div className="w-full space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}

      {/* Top Bar with Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-card"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {!editing && (
            <button
              type="button"
              disabled={copyingLast}
              onClick={copyPreviousReport}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/70 px-3 py-2 rounded-xl transition-all shadow-sm"
              title="Copy recurring keywords and website pages from your last report"
            >
              <span>📋</span>
              <span>{copyingLast ? 'Copying...' : 'Copy Last Report'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={copyWhatsAppSummary}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 px-3 py-2 rounded-xl transition-all shadow-sm"
            title="Generate & Copy WhatsApp client update format"
          >
            <span>📲</span>
            <span>Copy WhatsApp Update</span>
          </button>

          {draftSavedAt && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Auto-saved {draftSavedAt}
            </span>
          )}
        </div>
      </div>

      {/* Restored Draft Alert Banner */}
      {isDraftRestored && !editing && (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">💾</span>
            <span>
              <strong>Auto-saved draft restored</strong> (from {draftSavedAt}). You can continue editing where you left off.
            </span>
          </div>
          <button
            type="button"
            onClick={discardDraft}
            className="text-amber-800 hover:text-red-700 font-bold underline text-xs"
          >
            Discard Draft & Clear
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          {editing ? 'Edit Daily SEO Report' : 'Create Daily SEO Report'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Document your deliverables, campaign metrics, rankings, and links for review by your Team Lead.
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

      {/* Section 2: Website Work */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            02
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Website Work & Keywords</h2>
            <p className="text-[11px] text-slate-400">What you worked on across the website</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="label">Service Pages Worked On</label>
            <textarea
              className="input min-h-[80px]"
              rows="2"
              value={form.service_pages}
              onChange={set('service_pages')}
              placeholder="e.g. /web-design, /seo-services — pages & changes made..."
            />
          </div>

          <div>
            <label className="label">Blog Pages Worked On</label>
            <textarea
              className="input min-h-[80px]"
              rows="2"
              value={form.blog_pages}
              onChange={set('blog_pages')}
              placeholder="e.g. /blog/seo-tips-2026 — new posts / updates..."
            />
          </div>

          <div className="lg:col-span-2">
            <label className="label">Keywords Worked On</label>
            <input
              className="input"
              value={form.keywords}
              onChange={set('keywords')}
              placeholder="e.g. best dental clinic, teeth whitening near me (comma separated)"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Backlinks by Type & Live Links */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Backlinks Created</h2>
              <p className="text-[11px] text-slate-400">Enter how many of each type you built today</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p className="text-2xl font-extrabold text-emerald-600">{totalBacklinks}</p>
          </div>
        </div>

        {/* Quantities */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Classified</label>
            <input type="number" min="0" className="input" value={form.backlinks_classified} onChange={set('backlinks_classified')} placeholder="0" />
          </div>
          <div>
            <label className="label">Guest Post</label>
            <input type="number" min="0" className="input" value={form.backlinks_guest_post} onChange={set('backlinks_guest_post')} placeholder="0" />
          </div>
          <div>
            <label className="label">Blog Post</label>
            <input type="number" min="0" className="input" value={form.backlinks_blog_post} onChange={set('backlinks_blog_post')} placeholder="0" />
          </div>
          <div>
            <label className="label">Article Post</label>
            <input type="number" min="0" className="input" value={form.backlinks_article_post} onChange={set('backlinks_article_post')} placeholder="0" />
          </div>
        </div>

        {/* Live Backlink URLs Section */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>🔗</span>
                <span>Live Backlink URLs Log (Optional)</span>
              </h3>
              <p className="text-[11px] text-slate-400">Record individual live URLs built today for easy proof & audit</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkPaste(!showBulkPaste)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors"
              >
                {showBulkPaste ? '✕ Close Bulk Paste' : '📋 Bulk Paste URLs'}
              </button>
              <button
                type="button"
                onClick={addLiveLink}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-colors"
              >
                + Add Single Link
              </button>
            </div>
          </div>

          {/* Bulk Paste Box */}
          {showBulkPaste && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Paste Multiple URLs (One per line)</label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-semibold">Assign Type:</span>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value)}
                    className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1 bg-white"
                  >
                    {BACKLINK_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                className="input text-xs font-mono min-h-[90px]"
                rows="4"
                placeholder="https://classifieds.example.com/ad-1&#10;https://forum.example.com/topic-2&#10;https://blog.example.com/post-3"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPaste(false)}
                  className="btn-secondary text-xs py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkPasteLinks}
                  className="btn-primary text-xs py-1.5"
                  disabled={!bulkText.trim()}
                >
                  Import {bulkText.trim().split('\n').filter(Boolean).length} URLs
                </button>
              </div>
            </div>
          )}

          {/* Links List / Table */}
          {liveLinks.length > 0 && (
            <div className="space-y-2">
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Live URL</th>
                      <th className="py-2.5 px-3 w-48">Anchor / Keyword</th>
                      <th className="py-2.5 px-3 w-36">Type</th>
                      <th className="py-2.5 px-3 w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {liveLinks.map((link, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="https://..."
                            value={link.url}
                            onChange={(e) => updateLiveLink(idx, 'url', e.target.value)}
                            className="w-full text-xs font-mono px-2 py-1 rounded border border-slate-200 focus:border-brand-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Target Anchor"
                            value={link.anchor}
                            onChange={(e) => updateLiveLink(idx, 'anchor', e.target.value)}
                            className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:border-brand-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={link.type || 'Classified'}
                            onChange={(e) => updateLiveLink(idx, 'type', e.target.value)}
                            className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:border-brand-500 focus:outline-none bg-white"
                          >
                            {BACKLINK_TYPE_OPTIONS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeLiveLink(idx)}
                            className="text-red-500 hover:text-red-700 font-bold p-1 rounded hover:bg-red-50"
                            title="Remove link"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Attachments */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
              04
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Proof of Work Attachments</h2>
              <p className="text-[11px] text-slate-400">Upload or paste (Ctrl + V) ranking screenshots, Ahrefs/Semrush exports (max 5)</p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
            ⚡ Ctrl + V to Paste Screenshots
          </span>
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
            <p className="text-xs font-bold text-slate-700">Click, drag & drop, or press Ctrl + V anywhere</p>
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
          <p>Saving as Draft lets you continue editing anytime without notifying your lead.</p>
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
