import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import SearchableSiteInput from '../components/SearchableSiteInput';

const CATEGORIES = [
  {
    id: 'On-Page',
    label: 'On-Page Graphic / Banner',
    desc: 'Website hero & service page banners',
    icon: '🖼️',
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'Blog Request',
    label: 'Blog Request Visuals',
    desc: 'Featured images & blog graphics',
    icon: '✍️',
    gradient: 'from-indigo-600 to-purple-600',
  },
  {
    id: 'Social Media / Infographics',
    label: 'Social Media & Infographic',
    desc: 'Infographics, carousels & social posts',
    icon: '📱',
    gradient: 'from-purple-600 to-pink-600',
  },
];

const CATEGORY_CONFIG = {
  'On-Page': {
    subCategoryLabel: 'On-Page Graphic Type',
    subCategories: [
      { id: 'Hero Banner', label: 'Hero Banner / Slider', desc: 'Main website hero header visual', icon: '🖼️' },
      { id: 'Service Page Graphic', label: 'Service / Landing Page', desc: 'Visuals for service feature sections', icon: '🛠️' },
      { id: 'CTA Banner', label: 'CTA / Offer Banner', desc: 'Promotional & conversion action banner', icon: '💡' },
      { id: 'Section Layout Graphic', label: 'Section Illustration', desc: 'Custom vector graphic for page layout', icon: '📐' },
    ],
    keywordsPlaceholder: 'e.g. hero banner 1920x600, service landing page, call to action button, responsive header',
    titlePlaceholder: 'e.g. SEO Audit Service Landing Page Hero Banner (1920x600px)',
    templateText: `1. Dimensions & Aspect Ratio (e.g. 1920x600px desktop / 768x500px mobile)\n2. Primary Heading & Sub-heading text overlay\n3. Brand color palette & background theme (e.g. Dark Navy & Neon Blue)\n4. CTA Button text & destination link (e.g. "Get Free SEO Audit")`,
  },
  'Blog Request': {
    subCategoryLabel: 'Blog Category',
    subCategories: [
      { id: 'Information', label: 'Information (Informational)', desc: 'Visuals for explanatory & educational blogs', icon: '📚' },
      { id: 'Lexical', label: 'Lexical / Lyrical', desc: 'Visuals for word definitions & terms', icon: '🔤' },
      { id: 'Case Studies', label: 'Case Studies', desc: 'Charts & proof visuals for case studies', icon: '📈' },
      { id: 'Other', label: 'General / Other', desc: 'Standard blog thumbnails & feature images', icon: '🎨' },
    ],
    keywordsPlaceholder: 'e.g. backlink audit, technical seo, google indexing rate, search intent',
    titlePlaceholder: 'e.g. Top 10 High Authority SEO Backlink Strategies Header Visual',
    templateText: `1. Include a modern comparison bar chart of organic traffic vs paid traffic\n2. Use brand theme colors (Deep Navy #0f172a & Electric Indigo #4f46e5)\n3. Add clear typography for "150% Ranking Increase" header`,
  },
  'Social Media / Infographics': {
    subCategoryLabel: 'Social Media / Infographic Format',
    subCategories: [
      { id: 'Data Infographic', label: 'Statistical Infographic', desc: 'Detailed data & process flowchart infographic', icon: '📊' },
      { id: 'Social Carousel', label: 'LinkedIn / IG Carousel', desc: 'Multi-slide social post slides (1080x1080)', icon: '📱' },
      { id: 'Post Graphic', label: 'Social Announcement', desc: 'Single promo post graphic for Twitter/LinkedIn', icon: '📢' },
      { id: 'Story Banner', label: 'Vertical Story Banner', desc: '9:16 vertical ratio banner for Instagram/Pinterest', icon: '🎯' },
    ],
    keywordsPlaceholder: 'e.g. 1080x1080 square, linkedin carousel 5 slides, infographic flowchart, 9:16 story',
    titlePlaceholder: 'e.g. 5 Essential On-Page SEO Checklist LinkedIn Carousel (5 Slides)',
    templateText: `1. Aspect Ratio / Platform (e.g. 1080x1080 for Instagram / 1080x1350 for LinkedIn)\n2. Slide-by-slide text breakdown (Slide 1: Cover, Slide 2-4: Key points, Slide 5: CTA)\n3. Highlight key statistics or process flowchart icons\n4. Include website URL / social handle watermark`,
  },
};

export default function DesignRequestForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  // Designers List & Selected Designer
  const [designers, setDesigners] = useState([]);
  const [selectedDesigner, setSelectedDesigner] = useState('');

  // Single Form State
  const [category, setCategory] = useState('On-Page');
  const [blogCategory, setBlogCategory] = useState('Hero Banner');
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

  const currentConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['On-Page'];
  const selectedDesignerObj = selectedDesigner === 'all'
    ? { id: 'all', name: 'All Editors (Whole Team)' }
    : designers.find((d) => String(d.id) === String(selectedDesigner));

  useEffect(() => {
    api.get('/design-requests/designers')
      .then((r) => setDesigners(r.data.designers || []))
      .catch(() => {});
  }, []);

  // Handle Category Change
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    const newConfig = CATEGORY_CONFIG[newCat] || CATEGORY_CONFIG['On-Page'];
    if (newConfig.subCategories && newConfig.subCategories.length > 0) {
      setBlogCategory(newConfig.subCategories[0].id);
    }
  };

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
    if (!selectedDesigner) {
      setError('Please select an Editor before submitting this request.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        category,
        blog_category: blogCategory || null,
        title: title.trim() || null,
        keywords: keywords.trim() || null,
        points_to_include: pointsToInclude.trim() || null,
        priority,
        client_name: clientName.trim() || null,
        due_date: dueDate || null,
        attachments,
        designer_id: selectedDesigner,
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

  // Insert Template Text into Points to Include
  const handleInsertTemplate = () => {
    if (currentConfig.templateText) {
      setPointsToInclude(currentConfig.templateText);
    }
  };

  // CSV Template Downloader
  const downloadCSVTemplte = () => {
    const csvContent =
      'category,blog_category,title,keywords,points_to_include,priority,client_name,due_date\n' +
      '"On-Page","Hero Banner","Landing Page Hero Graphic","hero banner 1920x600, responsive","1. Dimensions 1920x600px desktop\\n2. Brand colors Dark Navy & Blue\\n3. CTA: Get Free SEO Audit","high","Apex Health Solutions","2026-10-01"\n' +
      '"Blog Request","Information","Top 10 High Authority SEO Strategies","backlink audit, technical seo","1. Include comparison bar chart of organic traffic\\n2. Highlight 150% growth rate","medium","Metro Dental Care & Clinic","2026-10-05"\n' +
      '"Social Media / Infographics","Social Carousel","5 Essential On-Page SEO Tips","linkedin carousel 5 slides, infographic","1. Slide 1: Cover\\n2. Slide 2-4: Key points\\n3. Slide 5: CTA","urgent","TechCrunch Inc","2026-10-10"';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'editor_requests_bulk_template.csv');
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
      if (row.category || row.keywords || row.title || row.points_to_include || row.client_name) {
        rows.push({
          id: i,
          category: row.category || 'Blog Request',
          blog_category: row.blog_category || row.blogcategory || row.sub_category || row.subcategory || 'Information',
          title: row.title || '',
          keywords: row.keywords || '',
          points_to_include: row.points_to_include || row.pointstoinclude || row.points || row.description || '',
          priority: ['low', 'medium', 'high', 'urgent'].includes((row.priority || '').toLowerCase())
            ? row.priority.toLowerCase()
            : 'medium',
          client_name: row.client_name || row.clientname || row.client || row.site || '',
          due_date: row.due_date || row.duedate || row.target_date || row.targetdate || '',
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
    if (!selectedDesigner) {
      setBulkError('Please select an Editor before submitting bulk requests.');
      return;
    }
    setBulkError('');
    setBulkLoading(true);
    try {
      const res = await api.post('/design-requests/bulk-csv', { designer_id: selectedDesigner, items: csvPreview });
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
    <div className="w-full max-w-[1600px] mx-auto space-y-4">
      {/* Header Banner - Compact & Sleek */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-4 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/design-requests" className="text-slate-400 hover:text-white transition-colors text-[11px] font-semibold flex items-center gap-1">
                <span>←</span> Editor Requests Hub
              </Link>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight mt-0.5 flex items-center gap-2 text-white">
              <span>✍️</span> Create Editor Request
            </h1>
          </div>

          {/* Mode Selector Tabs & Download Template */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={downloadCSVTemplte}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-300 hover:text-white bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download Sample CSV Template for Excel"
            >
              <span>📥</span> Download CSV Template
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'single'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>✏️</span> Single Request
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bulk')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'bulk'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📊</span> Submit CSV (Bulk Excel)
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE REQUEST FORM */}
      {activeTab === 'single' && (
        <form onSubmit={handleSubmitSingle} className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between">
              <span>⚠️ {error}</span>
              <button type="button" onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 font-bold">
                ✕
              </button>
            </div>
          )}

          {/* 1. CATEGORY & DYNAMIC SUB-CATEGORY */}
          <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Category</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Select Category</span>
            </div>

            {/* Primary Category Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CATEGORIES.map((c) => {
                const isActive = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryChange(c.id)}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 flex items-start gap-3 relative cursor-pointer ${
                      isActive
                        ? 'border-brand-500 bg-brand-50/50 text-brand-950 ring-2 ring-brand-500/20 shadow-xs font-bold'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${c.gradient} flex items-center justify-center text-white text-sm shadow-xs shrink-0 mt-0.5`}>
                      {c.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-900 leading-tight truncate">{c.label}</p>
                        {isActive && <span className="text-brand-600 font-bold text-xs shrink-0 ml-1">✓</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug truncate">{c.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Sub-Category Section (Adapts to Selected Category!) */}
            {currentConfig.subCategories && currentConfig.subCategories.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <span>↳ {currentConfig.subCategoryLabel}:</span>
                  </label>
                  <span className="text-[11px] text-indigo-500 font-medium">Tailored for {category}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {currentConfig.subCategories.map((sc) => {
                    const isActive = blogCategory === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setBlogCategory(sc.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                          isActive
                            ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs font-bold'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                        }`}
                      >
                        <span className="text-base shrink-0">{sc.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 block truncate">{sc.label}</span>
                            {isActive && <span className="text-indigo-600 font-bold text-xs shrink-0 ml-1">●</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. KEYWORDS */}
          <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Keywords</span>
              </label>
              <span className="text-slate-400 font-normal text-[11px]">Separate multiple keywords with commas</span>
            </div>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={currentConfig.keywordsPlaceholder}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs font-mono bg-slate-50/30 focus:bg-white"
            />
          </div>

          {/* 3. OPTIONAL TITLE */}
          <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Optional Title</span>
              </label>
              <span className="text-slate-400 font-normal text-[11px]">Topic / Title name for visual</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={currentConfig.titlePlaceholder}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs font-medium bg-slate-50/30 focus:bg-white"
            />
          </div>

          {/* 4. POINTS INCLUDE SPECIFIC */}
          <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">4</span>
                <span>Points Include Specific</span>
              </label>
              <button
                type="button"
                onClick={handleInsertTemplate}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
              >
                <span>⚡</span> Insert {category} Guidelines
              </button>
            </div>
            <textarea
              rows={4}
              value={pointsToInclude}
              onChange={(e) => setPointsToInclude(e.target.value)}
              placeholder={`Specify requirements for ${category}:\n${currentConfig.templateText}`}
              className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs font-sans bg-slate-50/30 focus:bg-white leading-normal"
            />
          </div>

          {/* Priority, Client & Attachments Section */}
          <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Additional Details & Attachments (Optional)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs font-semibold bg-slate-50/30 focus:bg-white"
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🔴 High Priority</option>
                  <option value="urgent">🔥 Urgent Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client / Project Name</label>
                <SearchableSiteInput
                  value={clientName}
                  onChange={(val) => setClientName(val)}
                  placeholder="Search or select site (e.g. Apex Health Solutions)..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs font-medium bg-slate-50/30 focus:bg-white"
                />
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-3 text-center block cursor-pointer transition-colors bg-slate-50/50 hover:bg-brand-50/10">
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                <div className="flex items-center justify-center gap-2 text-slate-700">
                  <span className="text-lg">📸</span>
                  <span className="text-xs font-bold">Upload Reference Mockups / Screenshots</span>
                  <span className="text-[11px] text-slate-400 font-normal">(PNG, JPG up to 5MB)</span>
                </div>
              </label>

              {attachments.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center shadow-xs">
                      {att.type === 'image' ? (
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] text-slate-600 p-1 truncate">{att.name}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold opacity-90 hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5. SELECT EDITOR / ASSIGNEE (MANDATORY) */}
          <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-slate-50 p-4 rounded-2xl border border-indigo-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">5</span>
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                  Select Editor / Assignee <span className="text-rose-500">*</span>
                </label>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                {designers.length} Editor{designers.length !== 1 ? 's' : ''} Available
              </span>
            </div>

            <p className="text-[11px] text-indigo-700 font-medium">
              Select which editor will work on this request. Submission is blocked until an editor is selected.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {/* Option: All Editors (Whole Team) */}
              <button
                type="button"
                onClick={() => { setSelectedDesigner('all'); setError(''); }}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  selectedDesigner === 'all'
                    ? 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-500/40 shadow-sm font-bold'
                    : 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-950 font-bold'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${selectedDesigner === 'all' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'}`}>
                  👥
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs truncate">All Editors (Whole Team)</p>
                    {selectedDesigner === 'all' && <span className="text-white font-bold text-xs shrink-0">✓</span>}
                  </div>
                  <p className={`text-[10px] font-mono truncate ${selectedDesigner === 'all' ? 'text-indigo-100' : 'text-indigo-600'}`}>
                    Broadcast request to all active editors
                  </p>
                </div>
              </button>

              {designers.map((d) => {
                const isSel = String(d.id) === String(selectedDesigner);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setSelectedDesigner(String(d.id)); setError(''); }}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      isSel
                        ? 'border-indigo-600 bg-white text-indigo-950 ring-2 ring-indigo-500/30 shadow-sm font-bold'
                        : 'border-indigo-100 hover:border-indigo-300 bg-white/80 hover:bg-white text-slate-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      ✍️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-900 truncate">{d.name}</p>
                        {isSel && <span className="text-indigo-600 font-bold text-xs shrink-0">✓</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono truncate">@{d.username} • [{d.role?.toUpperCase() || 'EDITOR'}]</p>
                    </div>
                  </button>
                );
              })}
            </div>


            {!selectedDesigner && (
              <p className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1.5 mt-2">
                <span>⚠️</span> You MUST select an editor before submitting this request.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/design-requests" className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !selectedDesigner}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 ${
                selectedDesigner
                  ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-900/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
              }`}
            >
              {loading
                ? 'Submitting...'
                : selectedDesignerObj
                ? `🚀 Submit to Editor (${selectedDesignerObj.name})`
                : '⚠️ Select an Editor First'}
            </button>
          </div>
        </form>
      )}

      {/* BULK CSV UPLOAD FORM */}
      {activeTab === 'bulk' && (
        <div className="space-y-4">
          {bulkError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between">
              <span>⚠️ {bulkError}</span>
              <button type="button" onClick={() => setBulkError('')} className="text-rose-400 hover:text-rose-600 font-bold">
                ✕
              </button>
            </div>
          )}

          {bulkSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span>✅</span>
              <span>{bulkSuccess}</span>
            </div>
          )}

          {/* Instructions & Template Download Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-4 rounded-2xl shadow-md space-y-3 border border-slate-800">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                  <span>📊</span> Excel / CSV Bulk Submission Guide
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-normal">
                  Upload an Excel (.csv) file containing multiple blog graphic & keyword requests. Each row in your CSV file will automatically create a designer request ticket.
                </p>
              </div>

              <button
                type="button"
                onClick={downloadCSVTemplte}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
              >
                📥 Download CSV Template
              </button>
            </div>
          </div>

          {/* File Picker */}
          <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/20 rounded-xl p-6 text-center block cursor-pointer transition-colors">
              <input type="file" accept=".csv,text/csv,application/vnd.ms-excel" onChange={handleCSVFileChange} className="hidden" />
              <div className="space-y-1">
                <span className="text-3xl block">📄</span>
                <p className="text-xs font-bold text-slate-800">
                  {csvFile ? `Selected File: ${csvFile.name}` : 'Click or Drag CSV File Here'}
                </p>
                <p className="text-[11px] text-slate-500">Supports standard CSV or Excel exported CSV files</p>
              </div>
            </label>
          </div>

          {/* SELECT EDITOR FOR BULK (MANDATORY) */}
          <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-slate-50 p-4 rounded-2xl border border-indigo-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2">
                <span>✍️</span> Select Editor for Bulk Requests <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                {designers.length} Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Option: All Editors (Whole Team) */}
              <button
                type="button"
                onClick={() => { setSelectedDesigner('all'); setBulkError(''); }}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  selectedDesigner === 'all'
                    ? 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-500/40 shadow-sm font-bold'
                    : 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-950 font-bold'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${selectedDesigner === 'all' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'}`}>
                  👥
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs truncate">All Editors (Whole Team)</p>
                    {selectedDesigner === 'all' && <span className="text-white font-bold text-xs shrink-0">✓</span>}
                  </div>
                  <p className={`text-[10px] font-mono truncate ${selectedDesigner === 'all' ? 'text-indigo-100' : 'text-indigo-600'}`}>
                    Broadcast request to all active editors
                  </p>
                </div>
              </button>

              {designers.map((d) => {
                const isSel = String(d.id) === String(selectedDesigner);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setSelectedDesigner(String(d.id)); setBulkError(''); }}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      isSel
                        ? 'border-indigo-600 bg-white text-indigo-950 ring-2 ring-indigo-500/30 shadow-sm font-bold'
                        : 'border-indigo-100 hover:border-indigo-300 bg-white/80 hover:bg-white text-slate-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      🎨
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-900 truncate">{d.name}</p>
                        {isSel && <span className="text-indigo-600 font-bold text-xs shrink-0">✓</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono truncate">@{d.username}</p>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* CSV Preview Table */}
          {csvPreview.length > 0 && (
            <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <span>👀</span> CSV File Preview ({csvPreview.length} items ready to submit)
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Valid Format
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white border-b border-slate-800 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3">#</th>
                      <th className="p-3">Category & Sub-Category</th>
                      <th className="p-3">Client / Site</th>
                      <th className="p-3">Title / Topic</th>
                      <th className="p-3">Keywords</th>
                      <th className="p-3">Points / Details</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {csvPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{row.category}</p>
                          {row.blog_category && (
                            <span className="inline-block mt-0.5 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200 text-[10px]">
                              {row.blog_category}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-indigo-900 max-w-[140px] truncate">
                          {row.client_name || '—'}
                        </td>
                        <td className="p-3 font-medium text-slate-800 max-w-[160px] truncate">{row.title || '—'}</td>
                        <td className="p-3 font-mono text-slate-600 max-w-[160px] truncate">{row.keywords || '—'}</td>
                        <td className="p-3 text-slate-600 max-w-[200px] truncate">{row.points_to_include || '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            row.priority === 'high' || row.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : row.priority === 'low'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {row.priority}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                          {row.due_date || '—'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeCSVRow(idx)}
                            className="text-rose-500 hover:text-rose-700 font-bold p-1 rounded hover:bg-rose-50 cursor-pointer"
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
                  disabled={bulkLoading || !selectedDesigner}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 ${
                    selectedDesigner
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
                  }`}
                >
                  {bulkLoading
                    ? 'Submitting Batch...'
                    : selectedDesignerObj
                    ? `🚀 Submit All ${csvPreview.length} Requests to ${selectedDesignerObj.name}`
                    : '⚠️ Select an Editor First'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
