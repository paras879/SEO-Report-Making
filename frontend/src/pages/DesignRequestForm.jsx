import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const CATEGORIES = [
  { id: 'On-Page', label: 'On-Page Graphic / Banner', icon: '🖼️' },
  { id: 'Blog Request', label: 'Blog Request Visuals', icon: '✍️' },
  { id: 'Social Media / Infographics', label: 'Social Media & Infographic', icon: '📱' },
  { id: 'Custom Graphic', label: 'Custom Graphic / UI Design', icon: '🎨' },
];

const BLOG_CATEGORIES = [
  { id: 'Information', label: 'Information (Informational Content)', desc: 'Graphics for explanatory & educational blogs' },
  { id: 'Lexical', label: 'Lexical / Lyrical', desc: 'Visuals for word, terminology or vocabulary blogs' },
  { id: 'Case Studies', label: 'Case Studies', desc: 'Charts & proof visuals for client case studies' },
  { id: 'Other', label: 'General / Other', desc: 'Standard blog thumbnails & feature images' },
];

export default function DesignRequestForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  // Single Form State
  const [category, setCategory] = useState('Blog Request');
  const [blogCategory, setBlogCategory] = useState('Information');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [pointsToInclude, setPointsToInclude] = useState('');
  const [priority, setPriority] = useState('medium');
  const [clientName, setClientName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Bulk CSV Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  // Handle Image Upload / Paste
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          { name: file.name, url: reader.result, type: file.type.startsWith('image/') ? 'image' : 'file', size: file.size },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Single Form
  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        category,
        blog_category: category === 'Blog Request' || category === 'On-Page' ? blogCategory : null,
        title: title.trim() || null,
        keywords: keywords.trim() || null,
        points_to_include: pointsToInclude.trim() || null,
        priority,
        client_name: clientName.trim() || null,
        due_date: dueDate || null,
        attachments,
      };

      const res = await api.post('/design-requests', payload);
      if (res.data.success) {
        navigate(`/design-requests/${res.data.request.id}`);
      } else {
        setError(res.data.message || 'Failed to submit design request');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error occurred');
    } finally {
      setLoading(false);
    }
  };

  // CSV Template Downloader
  const downloadCSVTemplte = () => {
    const csvContent =
      'category,blog_category,title,keywords,points_to_include,priority,client_name\n' +
      '"Blog Request","Information","SEO Audit Infographic","SEO audit, backlinks, technical seo","1. Include pie chart of backlink sources\\n2. Brand color blue #1e40af","high","Apex Dental"\n' +
      '"Blog Request","Lexical","Dictionary Term Visual","keyword density, search intent","1. Clear typography\\n2. Clean vector illustration","medium","Tech World"\n' +
      '"On-Page","Case Studies","Growth Case Study Banner","conversion rate, organic traffic","1. Show 150% traffic growth curve\\n2. Modern dark theme","high","Finance Hub"';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'blog_design_requests_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV File
  const handleCSVFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    setBulkError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const rows = parseCSVText(text);
        if (rows.length === 0) {
          setBulkError('CSV file is empty or invalid format');
          setCsvPreview([]);
          return;
        }
        setCsvPreview(rows);
      } catch (err) {
        setBulkError('Error parsing CSV file. Please use standard CSV format.');
      }
    };
    reader.readAsText(file);
  };

  // Simple Robust CSV Parser
  const parseCSVText = (text) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length === 0) continue;
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] || '';
      });
      if (row.category || row.keywords || row.title || row.points_to_include) {
        rows.push({
          id: i,
          category: row.category || 'Blog Request',
          blog_category: row.blog_category || row.blogcategory || 'Information',
          title: row.title || '',
          keywords: row.keywords || '',
          points_to_include: row.points_to_include || row.pointstoinclude || row.points || '',
          priority: ['low', 'medium', 'high', 'urgent'].includes((row.priority || '').toLowerCase())
            ? row.priority.toLowerCase()
            : 'medium',
          client_name: row.client_name || row.clientname || '',
        });
      }
    }
    return rows;
  };

  const removeCSVRow = (idx) => {
    setCsvPreview((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit CSV Bulk Requests
  const handleSubmitBulk = async () => {
    if (csvPreview.length === 0) {
      setBulkError('No valid rows to submit. Please upload a CSV file.');
      return;
    }
    setBulkError('');
    setBulkLoading(true);
    try {
      const res = await api.post('/design-requests/bulk-csv', { items: csvPreview });
      if (res.data.success) {
        setBulkSuccess(`Successfully submitted ${res.data.count} design requests! Redirecting...`);
        setTimeout(() => {
          navigate('/design-requests');
        }, 1500);
      } else {
        setBulkError(res.data.message || 'Failed to submit bulk requests');
      }
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Failed to process bulk upload');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/design-requests" className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
              ← Designer Requests
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <span>🎨</span> Create Designer Request
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Submit single or bulk keyword/blog graphic requirements for the design team.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'single' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✏️ Single Request
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'bulk' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Submit CSV (Bulk Excel)
          </button>
        </div>
      </div>

      {/* SINGLE REQUEST FORM */}
      {activeTab === 'single' && (
        <form onSubmit={handleSubmitSingle} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
              <span>⚠️ {error}</span>
              <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold">
                ✕
              </button>
            </div>
          )}

          {/* Category Selection */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Select Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    category === c.id
                      ? 'border-brand-500 bg-brand-50/40 text-brand-900 ring-2 ring-brand-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700'
                  }`}
                >
                  <span className="text-2xl mb-2">{c.icon}</span>
                  <div>
                    <p className="font-bold text-sm leading-tight">{c.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Blog Category Selection (Conditional) */}
          {(category === 'Blog Request' || category === 'On-Page') && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 animate-fade-in">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-600">
                2. Select Blog Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BLOG_CATEGORIES.map((bc) => (
                  <button
                    key={bc.id}
                    type="button"
                    onClick={() => setBlogCategory(bc.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      blogCategory === bc.id
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm block">{bc.label}</span>
                    <span className="text-xs text-slate-500 block mt-1 leading-snug">{bc.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Requirement Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Optional Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Title / Topic Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 10 Best SEO Strategies for 2026 Header Banner"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🔴 High Priority</option>
                  <option value="urgent">🔥 Urgent Priority</option>
                </select>
              </div>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Keywords <span className="text-slate-400 font-normal">(Comma separated)</span>
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. backlink audit, technical seo, google indexing"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>

            {/* Specific Points to Include */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Points to Include (Specific Instructions)
              </label>
              <textarea
                rows={4}
                value={pointsToInclude}
                onChange={(e) => setPointsToInclude(e.target.value)}
                placeholder="1. Include a comparison table visual for SEO vs PPC&#10;2. Use company brand palette (Dark Indigo #0f172a & Electric Blue #2563eb)&#10;3. Add clear graph icon showing keyword rank boost"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-sans"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Client / Project Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Client / Project Name (Optional)</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Apex Dental Clinic"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              {/* Target Due Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Reference Screenshots / Attachments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">4. Reference Images / Inspiration (Optional)</h3>

            <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center block cursor-pointer transition-colors bg-slate-50/50">
              <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
              <div className="space-y-1">
                <span className="text-3xl">📸</span>
                <p className="text-sm font-semibold text-slate-700">Click to upload reference mockups or screenshots</p>
                <p className="text-xs text-slate-400">PNG, JPG up to 5MB</p>
              </div>
            </label>

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-600 p-2 truncate">{att.name}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-90 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/design-requests" className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-900/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? 'Submitting...' : '🚀 Submit Request'}
            </button>
          </div>
        </form>
      )}

      {/* BULK CSV UPLOAD FORM */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          {bulkError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
              <span>⚠️ {bulkError}</span>
              <button type="button" onClick={() => setBulkError('')} className="text-red-400 hover:text-red-600 font-bold">
                ✕
              </button>
            </div>
          )}

          {bulkSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>✅</span>
              <span>{bulkSuccess}</span>
            </div>
          )}

          {/* Instructions & Template Download Card */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>📊</span> Excel / CSV Bulk Submission Guide
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Upload an Excel (.csv) file containing multiple blog graphic & keyword requests. Each row in your CSV file will automatically create a designer request ticket.
                </p>
              </div>

              <button
                type="button"
                onClick={downloadCSVTemplte}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-2"
              >
                📥 Download Sample CSV Template
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-white/10 text-slate-300">
              <div><strong className="text-white">category:</strong> Blog Request, On-Page</div>
              <div><strong className="text-white">blog_category:</strong> Information, Lexical, Case Studies</div>
              <div><strong className="text-white">title:</strong> (Optional Topic Title)</div>
              <div><strong className="text-white">keywords:</strong> (Comma separated)</div>
            </div>
          </div>

          {/* File Picker */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/20 rounded-2xl p-8 text-center block cursor-pointer transition-colors">
              <input type="file" accept=".csv,text/csv,application/vnd.ms-excel" onChange={handleCSVFileChange} className="hidden" />
              <div className="space-y-2">
                <span className="text-4xl">📄</span>
                <p className="text-sm font-bold text-slate-800">
                  {csvFile ? `Selected: ${csvFile.name}` : 'Click or Drag CSV File Here'}
                </p>
                <p className="text-xs text-slate-500">Supports standard CSV / Excel exported CSV files</p>
              </div>
            </label>
          </div>

          {/* CSV Preview Table */}
          {csvPreview.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>👀</span> CSV File Preview ({csvPreview.length} items ready to submit)
                </h3>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  Valid CSV Format
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider">
                      <th className="p-3">#</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Blog Sub-Category</th>
                      <th className="p-3">Title / Topic</th>
                      <th className="p-3">Keywords</th>
                      <th className="p-3">Specific Points</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {csvPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">{row.category}</td>
                        <td className="p-3">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-100">
                            {row.blog_category || '—'}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-700 max-w-[150px] truncate">{row.title || '—'}</td>
                        <td className="p-3 font-mono text-slate-600 max-w-[180px] truncate">{row.keywords || '—'}</td>
                        <td className="p-3 text-slate-600 max-w-[220px] truncate">{row.points_to_include || '—'}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeCSVRow(idx)}
                            className="text-red-500 hover:text-red-700 font-bold p-1 rounded hover:bg-red-50"
                            title="Remove row"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSubmitBulk}
                  disabled={bulkLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-900/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {bulkLoading ? 'Submitting Batch...' : `🚀 Submit All ${csvPreview.length} Requests`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
