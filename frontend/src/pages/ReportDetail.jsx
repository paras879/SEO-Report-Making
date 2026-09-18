import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { PRIORITY_STYLE, roleLabel } from '../constants';

function DetailItem({ label, value, icon, className = '' }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className={`p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap break-words">{value}</p>
    </div>
  );
}

export default function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const copyWhatsAppSummary = () => {
    if (!data?.report) return;
    const r = data.report;
    const dateFormatted = r.report_date?.slice(0, 10) || 'Today';
    let parsedLinks = [];
    if (r.backlink_urls) {
      try {
        parsedLinks = typeof r.backlink_urls === 'string' ? JSON.parse(r.backlink_urls) : r.backlink_urls;
      } catch {}
    }

    const lines = [
      `📊 *Daily SEO Update — ${dateFormatted}*`,
      r.title ? `📝 *Title:* ${r.title}` : '',
      r.employee_name ? `👤 *Submitted By:* ${r.employee_name}` : '',
      r.task_done ? `✅ *Work Done:* ${r.task_done}` : '',
      r.service_pages ? `🧩 *Service Pages:* ${r.service_pages}` : '',
      r.blog_pages ? `📝 *Blog Pages:* ${r.blog_pages}` : '',
      r.keywords ? `🎯 *Keywords:* ${r.keywords}` : '',
      `🔗 *Backlinks Created (${r.backlinks_created ?? 0} Total):*`,
      `   • Classified: ${r.backlinks_classified || 0}`,
      `   • Guest Post: ${r.backlinks_guest_post || 0}`,
      `   • Blog Post: ${r.backlinks_blog_post || 0}`,
      `   • Article Post: ${r.backlinks_article_post || 0}`,
    ];

    if (Array.isArray(parsedLinks) && parsedLinks.length > 0) {
      lines.push(`🌐 *Live Links Built (${parsedLinks.length}):*`);
      parsedLinks.slice(0, 5).forEach((l) => {
        lines.push(`   • ${l.url} ${l.anchor ? `(${l.anchor})` : ''}`);
      });
      if (parsedLinks.length > 5) {
        lines.push(`   • ...and ${parsedLinks.length - 5} more links`);
      }
    }

    if (r.remarks) lines.push(`📌 *Remarks:* ${r.remarks}`);

    const text = lines.filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    showToast('📲 WhatsApp client update copied to clipboard!');
  };

  // Build a clean, print-friendly report and open the browser's Save-as-PDF dialog.
  // No external library needed — works everywhere.
  const downloadPdf = () => {
    if (!data?.report) return;
    const r = data.report;
    const esc = (v) =>
      v === null || v === undefined
        ? ''
        : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const dateFormatted = r.report_date?.slice(0, 10) || '';
    let parsedLinks = [];
    if (r.backlink_urls) {
      try {
        parsedLinks = typeof r.backlink_urls === 'string' ? JSON.parse(r.backlink_urls) : r.backlink_urls;
      } catch {}
    }
    const row = (label, value) =>
      value === null || value === undefined || value === '' || value === false
        ? ''
        : `<tr><td class="lbl">${esc(label)}</td><td class="val">${esc(value)}</td></tr>`;
    const linksHtml =
      Array.isArray(parsedLinks) && parsedLinks.length
        ? `<h3>Live Backlink URLs (${parsedLinks.length})</h3><ul>${parsedLinks
            .map((l) => `<li>${esc(l.url || '')}${l.anchor ? ` — ${esc(l.anchor)}` : ''}</li>`)
            .join('')}</ul>`
        : '';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>SEO Report — ${esc(r.title || 'Report')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 32px; }
  .head { border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 20px; }
  .head h1 { margin: 0 0 6px; font-size: 22px; }
  .meta { color: #64748b; font-size: 13px; }
  .pill { display: inline-block; background: #eef2ff; color: #4f46e5; border-radius: 6px; padding: 2px 10px; font-size: 12px; font-weight: 700; margin-right: 6px; }
  h3 { margin: 22px 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td { padding: 7px 10px; font-size: 13px; vertical-align: top; border-bottom: 1px solid #f1f5f9; }
  td.lbl { color: #64748b; font-weight: 600; width: 34%; text-transform: uppercase; font-size: 11px; letter-spacing: .03em; }
  td.val { color: #0f172a; font-weight: 500; white-space: pre-wrap; }
  ul { margin: 6px 0; padding-left: 20px; font-size: 13px; }
  .foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="head">
    <h1>${esc(r.title || 'SEO Report')}</h1>
    <div class="meta">
      <span class="pill">${esc((r.status || '').replace(/_/g, ' ').toUpperCase())}</span>
      <span class="pill">${esc((r.priority || 'medium').toUpperCase())} PRIORITY</span>
      ${dateFormatted ? `<span>📅 ${esc(dateFormatted)}</span>` : ''}
    </div>
  </div>
  <h3>Overview</h3>
  <table>
    ${row('Employee', r.employee_name)}
    ${row('Team', r.team_name)}
    ${row('Team Lead', r.team_lead_name)}
    ${row('Client', r.client_name)}
    ${row('Project', r.project_name)}
    ${row('Website', r.website_url)}
    ${row('Hours Worked', r.hours_worked != null ? `${r.hours_worked} hrs` : '')}
    ${row('Work Status', r.work_status)}
  </table>
  <h3>Work & Deliverables</h3>
  <table>
    ${row('Work Done', r.task_done)}
    ${row('Service Pages', r.service_pages)}
    ${row('Blog Pages', r.blog_pages)}
    ${row('Keywords', r.keywords)}
    ${row('Challenges', r.challenges)}
    ${row('Next Day Plan', r.next_day_plan)}
    ${row('Remarks', r.remarks)}
  </table>
  <h3>Backlinks (${esc(r.backlinks_created ?? 0)} total)</h3>
  <table>
    ${row('Classified', r.backlinks_classified || 0)}
    ${row('Guest Post', r.backlinks_guest_post || 0)}
    ${row('Blog Post', r.backlinks_blog_post || 0)}
    ${row('Article Post', r.backlinks_article_post || 0)}
  </table>
  ${linksHtml}
  <div class="foot">Generated from SEO Report System · ${esc(new Date().toLocaleString())}</div>
  <script>window.onload = function(){ window.print(); }</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) {
      showToast('⚠️ Please allow pop-ups to download the PDF');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const load = () => {
    api.get(`/reports/${id}`).then((r) => setData(r.data)).catch((e) => setErr(e.response?.data?.message || 'Failed to load report'));
  };
  useEffect(load, [id]);

  const postComment = async () => {
    const msg = newComment.trim();
    if (!msg) return;
    setPosting(true); setErr('');
    try {
      await api.post(`/reports/${id}/comments`, { message: msg });
      setNewComment('');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const act = async (path, body) => {
    setBusy(true); setErr('');
    try {
      await api.post(`/reports/${id}/${path}`, body || {});
      load();
      setComment('');
    } catch (e) {
      setErr(e.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const download = async (att) => {
    try {
      const res = await api.get(`/reports/${id}/attachments/${att.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = att.file_name; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr('Download failed');
    }
  };

  if (err && !data) {
    return (
      <div className="w-full space-y-4">
        <button onClick={() => navigate(-1)} className="btn-secondary text-xs">← Back to Reports</button>
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold uppercase tracking-wider">Loading Report...</span>
        </div>
      </div>
    );
  }

  const r = data.report;
  const isOwner = r.employee_id === user.id;
  const canEmployeeEdit = isOwner && ['draft', 'tl_rejected'].includes(r.status);
  const canTLAct = user.role === 'team_lead' && r.status === 'submitted';
  const canAdminAct = user.role === 'admin' && r.status === 'forwarded';

  const authorInitials = (r.employee_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  let liveBacklinkUrls = [];
  if (r.backlink_urls) {
    try {
      const parsed = typeof r.backlink_urls === 'string' ? JSON.parse(r.backlink_urls) : r.backlink_urls;
      if (Array.isArray(parsed)) liveBacklinkUrls = parsed;
    } catch {}
  }

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}

      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/reports')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-card"
        >
          <span>←</span>
          <span>Back to Reports</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadPdf}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/70 px-3.5 py-2 rounded-xl transition-all shadow-sm"
            title="Download this report as a PDF"
          >
            <span>📄</span>
            <span>Download PDF</span>
          </button>
          <button
            type="button"
            onClick={copyWhatsAppSummary}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 px-3.5 py-2 rounded-xl transition-all shadow-sm"
            title="Copy formatted client update for WhatsApp"
          >
            <span>📲</span>
            <span>Copy WhatsApp Update</span>
          </button>

          {canEmployeeEdit && (
            <Link to={`/reports/${id}/edit`} className="btn-secondary text-xs">
              <span>✏️</span>
              <span>Edit Report</span>
            </Link>
          )}
        </div>
      </div>

      {err && (
        <div className="alert-error">
          <span>⚠️</span>
          <span>{err}</span>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="card p-6 md:p-8 bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/90 shadow-card">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={r.status} />
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${PRIORITY_STYLE[r.priority] || ''}`}>
                ● {(r.priority || 'medium')} Priority
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                📅 {r.report_date?.slice(0, 10)}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {r.title}
            </h1>

            {/* Author Profile Strip */}
            <div className="flex items-center gap-3 pt-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm ring-2 ring-white">
                {authorInitials}
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800">{r.employee_name}</p>
                <p className="text-slate-400 font-medium">{r.team_name ? `Team: ${r.team_name}` : 'Independent Contributor'}</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Callout */}
          <div className="flex md:flex-col items-center md:items-end justify-between gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="text-left md:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hours Logged</p>
              <p className="text-xl font-extrabold text-slate-800">{r.hours_worked ? `${r.hours_worked} hrs` : '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Work Status</p>
              <span className="inline-block px-2.5 py-0.5 mt-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold capitalize">
                {r.work_status || 'In Progress'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Basic Work & SEO Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Work Section */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="text-lg">📋</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Execution & Work Overview</h2>
          </div>

          <div className="space-y-3">
            <DetailItem label="Work Done" value={r.task_done} icon="✍️" />

            {r.challenges && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Problems / Blockers Encountered</span>
                </p>
                <p className="text-sm font-medium text-amber-900 whitespace-pre-wrap break-words">{r.challenges}</p>
              </div>
            )}

            {r.next_day_plan && (
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/70">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Next Day Plan</span>
                </p>
                <p className="text-sm font-medium text-blue-950 whitespace-pre-wrap break-words">{r.next_day_plan}</p>
              </div>
            )}

            {r.remarks && <DetailItem label="Remarks" value={r.remarks} icon="💬" />}
          </div>
        </div>

        {/* SEO Metrics & Client Info */}
        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-lg">🔍</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Website Work & Backlinks</h2>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Keywords Worked On</p>
                <p className="text-sm font-semibold text-slate-800">{r.keywords || '—'}</p>
              </div>
              {r.service_pages && <DetailItem label="Service Pages" value={r.service_pages} icon="🧩" />}
              {r.blog_pages && <DetailItem label="Blog Pages" value={r.blog_pages} icon="📝" />}
              {/* backward-compat: old reports may have these */}
              {r.onpage_work && <DetailItem label="On-Page Work" value={r.onpage_work} icon="📄" />}
              {r.offpage_work && <DetailItem label="Off-Page Work" value={r.offpage_work} icon="🌐" />}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Backlinks Created</p>
                <p className="text-xs font-bold text-emerald-700">Total: {r.backlinks_created ?? 0}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[['Classified', r.backlinks_classified], ['Guest Post', r.backlinks_guest_post], ['Blog Post', r.backlinks_blog_post], ['Article Post', r.backlinks_article_post]].map(([label, val]) => (
                  <div key={label} className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
                    <p className="text-lg font-extrabold text-emerald-800">{val ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Backlink URLs Log */}
            {liveBacklinkUrls.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Backlinks Log</p>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {liveBacklinkUrls.length} links recorded
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                        <th className="py-2 px-3 w-8">#</th>
                        <th className="py-2 px-3">Live URL</th>
                        <th className="py-2 px-3">Anchor</th>
                        <th className="py-2 px-3">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {liveBacklinkUrls.map((link, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="py-1.5 px-3 text-slate-400 font-semibold">{i + 1}</td>
                          <td className="py-1.5 px-3">
                            <a
                              href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 hover:text-brand-700 hover:underline font-mono truncate max-w-xs block"
                            >
                              {link.url} ↗
                            </a>
                          </td>
                          <td className="py-1.5 px-3 font-medium text-slate-700">{link.anchor || '—'}</td>
                          <td className="py-1.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {link.type || 'Backlink'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Client & Project Info */}
          {(r.client_name || r.project_name || r.website_url) && (
            <div className="card space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="text-lg">🏢</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Client & Campaign</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DetailItem label="Client" value={r.client_name} icon="👤" />
                <DetailItem label="Project" value={r.project_name} icon="📁" />
              </div>
              {r.website_url && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Website</p>
                    <p className="text-xs font-semibold text-slate-700 truncate">{r.website_url}</p>
                  </div>
                  <a
                    href={r.website_url.startsWith('http') ? r.website_url : `https://${r.website_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs font-bold text-brand-600 hover:text-brand-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    Open ↗
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attachments Section */}
      {data.attachments?.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">📎</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Proof & Attachments</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">{data.attachments.length} files attached</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.attachments.map((a) => (
              <div
                key={a.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-card transition-all flex items-center justify-between group"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-brand-600 transition-colors">
                    {a.file_name}
                  </p>
                  <p className="text-[10px] text-slate-400">Click to download</p>
                </div>
                <button
                  onClick={() => download(a)}
                  className="shrink-0 p-2 rounded-lg bg-slate-100 group-hover:bg-brand-50 text-slate-600 group-hover:text-brand-600 transition-colors"
                  title="Download attachment"
                >
                  ⬇
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Review Actions Card */}
      {(canEmployeeEdit || canTLAct || canAdminAct) && (
        <div className="card bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white border-0 shadow-xl p-6 md:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚡</span>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Review & Action Workflow</h3>
                <p className="text-xs text-slate-400">Advance this report to the next lifecycle stage</p>
              </div>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-white/90">
              Role: {roleLabel(user.role)}
            </span>
          </div>

          {(canTLAct || canAdminAct) && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Review Feedback / Remarks (Optional)
              </label>
              <textarea
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white/15 transition-all"
                rows="2"
                placeholder="Add notes for your decision (e.g. 'Backlinks verified', 'Please revise on-page details')..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {canEmployeeEdit && (
              <>
                <Link to={`/reports/${id}/edit`} className="btn-secondary text-slate-800">
                  ✏️ Edit Report
                </Link>
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => act('submit')}
                >
                  {busy ? 'Submitting...' : '🚀 Submit to Team Lead'}
                </button>
              </>
            )}

            {canTLAct && (
              <>
                <button
                  className="btn-success"
                  disabled={busy}
                  onClick={() => act('forward', { comment })}
                >
                  {busy ? 'Processing...' : '✓ Forward to Admin'}
                </button>
                <button
                  className="btn-danger"
                  disabled={busy}
                  onClick={() => act('reject', { comment })}
                >
                  {busy ? 'Processing...' : '↩ Return to Employee'}
                </button>
              </>
            )}

            {canAdminAct && (
              <>
                <button
                  className="btn-success"
                  disabled={busy}
                  onClick={() => act('approve', { comment })}
                >
                  {busy ? 'Processing...' : '🎉 Approve Report'}
                </button>
                <button
                  className="btn-danger"
                  disabled={busy}
                  onClick={() => act('admin-reject', { comment })}
                >
                  {busy ? 'Processing...' : '↩ Return to Team Lead'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Discussion & Audit Chain Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Discussion / Comments */}
        <div className="card flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Discussion Thread</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">{data.comments?.length || 0} messages</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
            {data.comments?.map((c) => {
              const mine = c.user_id === user.id;
              const initials = (c.user_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={c.id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                    mine ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {initials}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm rounded-tr-none'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
                  }`}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className={`text-[11px] font-bold ${mine ? 'text-brand-100' : 'text-slate-600'}`}>
                        {c.user_name}
                      </span>
                      <span className={`text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded ${
                        mine ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {roleLabel(c.user_role)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{c.message}</p>
                    <p className={`text-[9px] mt-1 text-right ${mine ? 'text-brand-200' : 'text-slate-400'}`}>
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}

            {(!data.comments || data.comments.length === 0) && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                <span className="text-3xl mb-1">💭</span>
                <p className="text-xs font-semibold">No comments yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Post a message below to start the conversation</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <input
              className="input text-xs py-2"
              placeholder="Write a message..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  postComment();
                }
              }}
            />
            <button
              className="btn-primary text-xs px-4"
              disabled={posting || !newComment.trim()}
              onClick={postComment}
            >
              {posting ? '...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Report Flow / Audit History */}
        <div className="card flex flex-col h-[460px]">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
            <span className="text-lg">🔗</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Lifecycle Audit Flow</h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            <ol className="relative border-l-2 border-slate-200 ml-3 space-y-5 my-2">
              {data.actions?.map((a) => {
                const isApproved = a.action?.toLowerCase().includes('approve');
                const isRejected = a.action?.toLowerCase().includes('reject');
                const dotColor = isApproved ? 'bg-emerald-500' : isRejected ? 'bg-red-500' : 'bg-brand-500';

                return (
                  <li key={a.id} className="ml-5">
                    <div className={`absolute -left-1.5 w-3 h-3 rounded-full ${dotColor} ring-4 ring-white`}></div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800">
                          {a.action_by_name}{' '}
                          <span className="font-normal text-slate-500">({roleLabel(a.action_by_role)})</span>
                        </p>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                          {a.action}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {a.from_level} → {a.to_level} · {new Date(a.created_at).toLocaleString()}
                      </p>
                      {a.comment && (
                        <div className="mt-1.5 p-2 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700 italic">
                          "{a.comment}"
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}

              {(!data.actions || data.actions.length === 0) && (
                <li className="ml-5 text-xs text-slate-400">No actions recorded yet</li>
              )}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
