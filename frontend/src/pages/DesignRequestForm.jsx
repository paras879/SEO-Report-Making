import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import SearchableSiteInput from '../components/SearchableSiteInput';

const CATEGORIES = [
  {
    id: 'Website Copy',
    label: 'Website & Page Copy',
    desc: 'Landing page, service page & website section copy',
    icon: '📝',
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'Blog Content',
    label: 'Blog & Article Content',
    desc: 'Informational blog posts, guides & case studies',
    icon: '📚',
    gradient: 'from-indigo-600 to-purple-600',
  },
  {
    id: 'Social Media & PR',
    label: 'Social Media Copy & PR',
    desc: 'Social captions, ad copy, press releases & emails',
    icon: '📢',
    gradient: 'from-purple-600 to-pink-600',
  },
];

const CATEGORY_CONFIG = {
  'Website Copy': {
    subCategoryLabel: 'Website Content Type',
    subCategories: [
      { id: 'Landing Page Copy', label: 'Landing Page Copy', desc: 'Hero section & conversion landing page copy', icon: '📝' },
      { id: 'Service Page Content', label: 'Service Page Content', desc: 'Detailed service description & feature copy', icon: '🛠️' },
      { id: 'CTA & Offer Copy', label: 'CTA & Offer Copy', desc: 'Call-to-action text & promotional offers', icon: '💡' },
      { id: 'About / Corporate Copy', label: 'About / Corporate Copy', desc: 'Company profile, team & mission statement text', icon: '🏢' },
    ],
    keywordsPlaceholder: 'e.g. SEO audit service, target audience, conversion copywriting, value proposition',
    titlePlaceholder: 'e.g. SEO Audit Service Landing Page Headline & Hero Section Copy',
    templateText: `1. Target Audience & Tone of Voice (e.g. Professional, Persuasive, B2B)\n2. Primary Headline & Sub-headline text\n3. Key Value Propositions & Benefit points\n4. Call To Action (CTA) button text & desired customer action`,
  },
  'Blog Content': {
    subCategoryLabel: 'Blog Content Category',
    subCategories: [
      { id: 'Informational Blog Post', label: 'Informational Blog Post', desc: 'Explanatory articles & educational how-to guides', icon: '📚' },
      { id: 'SEO Keyword Article', label: 'SEO Keyword Article', desc: 'Search engine optimized content targeting high-volume keywords', icon: '🔍' },
      { id: 'Case Study Content', label: 'Case Study Content', desc: 'Client success story breakdown with data & results', icon: '📈' },
      { id: 'Glossary / Terminology', label: 'Glossary / Terminology', desc: 'Definition of industry terms & lexical reference text', icon: '🔤' },
    ],
    keywordsPlaceholder: 'e.g. backlink audit, technical seo, google indexing rate, search intent',
    titlePlaceholder: 'e.g. Top 10 High Authority SEO Backlink Strategies for 2026',
    templateText: `1. Proposed Word Count (e.g. 1500-2000 words)\n2. Target Primary & Secondary Keywords\n3. Article Outline / Subheadings (H2, H3 structure)\n4. Internal & External Linking preferences`,
  },
  'Social Media & PR': {
    subCategoryLabel: 'Social Media & PR Format',
    subCategories: [
      { id: 'Social Media Captions / Post', label: 'Social Media Captions / Post', desc: 'Engaging captions for LinkedIn, Instagram or X/Twitter', icon: '📢' },
      { id: 'Ad Copy & Headlines', label: 'Ad Copy & Headlines', desc: 'Google / Meta ad headlines, descriptions & hooks', icon: '🎯' },
      { id: 'Press Release / PR', label: 'Press Release / PR', desc: 'Official media release & company announcement copy', icon: '📰' },
      { id: 'Email Newsletter Copy', label: 'Email Newsletter Copy', desc: 'Subscriber newsletter body text & subject lines', icon: '✉️' },
    ],
    keywordsPlaceholder: 'e.g. linkedin post captions, google ads headline, press release, newsletter subject lines',
    titlePlaceholder: 'e.g. 5 Essential On-Page SEO Checklist LinkedIn Post & Caption Series',
    templateText: `1. Target Social Platform (e.g. LinkedIn, Instagram, Twitter, Email)\n2. Post Hook / Subject Line\n3. Key takeaways & bullet points\n4. Hashtags & Call-To-Action link`,
  },
};

export default function DesignRequestForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  // Editors/Designers List & Selected Assignee
  const [designers, setDesigners] = useState([]);
  const [selectedDesigner, setSelectedDesigner] = useState('');

  // Single Form State
  const [category, setCategory] = useState('Website Copy');
  const [blogCategory, setBlogCategory] = useState('Landing Page Copy');
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

  const currentConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Website Copy'];
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
    const newConfig = CATEGORY_CONFIG[newCat] || CATEGORY_CONFIG['Website Copy'];
    if (newConfig.subCategories && newConfig.subCategories.length > 0) {
      setBlogCategory(newConfig.subCategories[0].id);
    }
  };

  // Handle File Upload
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
        setError(res.data.message || 'Failed to submit content request');
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

  // CSV Template Downloader for Content Requests
  const downloadCSVTemplte = () => {
    const csvContent =
      'category,blog_category,title,keywords,points_to_include,priority,client_name,due_date\n' +
      '"Website Copy","Landing Page Copy","SEO Audit Landing Page Content","seo audit service, conversion copywriting","1. Hero section headline & sub-headline\\n2. Value proposition bullet points\\n3. CTA: Get Free Audit","high","Apex Health Solutions","2026-10-01"\n' +
      '"Website Copy","Service Page Content","Dental Services Feature Page Copy","dental care, clinic features","1. Comprehensive service breakdown\\n2. Patient testimonial snippets","medium","Metro Dental Care & Clinic","2026-10-02"\n' +
      '"Blog Content","Informational Blog Post","Top 10 High Authority SEO Strategies","backlink audit, technical seo","1. 1500 words detailed guide\\n2. H2 & H3 subheadings with keyword placement","medium","CloudSync Pro B2B","2026-10-05"\n' +
      '"Blog Content","Glossary / Terminology","SEO Terminology & Glossary Copy","seo terms, indexing, crawl budget","1. Clear definitions of 15 key SEO terms","low","SEO Growth Marketing Agency","2026-10-06"\n' +
      '"Social Media & PR","Social Media Captions / Post","5 Essential On-Page SEO Checklist","linkedin captions, seo checklist","1. 5-slide LinkedIn carousel text breakdown\\n2. Hashtags & link to blog","urgent","TechCrunch Inc","2026-10-10"';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'content_requests_bulk_template.csv');
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

  // CSV Parser
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
        let cat = row.category || 'Blog Content';
        const lowerCat = cat.toLowerCase();
        if (lowerCat.includes('website') || lowerCat.includes('page') || lowerCat.includes('on-page') || lowerCat.includes('copy')) cat = 'Website Copy';
        else if (lowerCat.includes('blog') || lowerCat.includes('article')) cat = 'Blog Content';
        else if (lowerCat.includes('social') || lowerCat.includes('pr') || lowerCat.includes('ad')) cat = 'Social Media & PR';

        let subCat = row.blog_category || row.blogcategory || row.sub_category || row.subcategory || '';
        if (!subCat) {
          if (cat === 'Website Copy') subCat = 'Landing Page Copy';
          else if (cat === 'Blog Content') subCat = 'Informational Blog Post';
          else subCat = 'Social Media Captions / Post';
        }

        rows.push({
          id: i,
          category: cat,
          blog_category: subCat,
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
        setBulkSuccess(`Successfully submitted ${res.data.count} content requests! Redirecting...`);
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
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-4 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/design-requests" className="text-slate-400 hover:text-white transition-colors text-[11px] font-semibold flex items-center gap-1">
                <span>←</span> Content Requests Hub
              </Link>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight mt-0.5 flex items-center gap-2 text-white">
              <span>✍️</span> Raise a Content Request
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
              <span className="text-[11px] text-slate-400 font-medium">Select Content Category</span>
            </div>

            {/* Primary Category Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

            {/* Dynamic Sub-Category Section */}
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
              <span className="text-slate-400 font-normal text-[11px]">Topic / Title name for content</span>
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
                Additional Details & Reference Documents (Optional)
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

            {/* Document / Image upload */}
            <div>
              <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-3 text-center block cursor-pointer transition-colors bg-slate-50/50 hover:bg-brand-50/10">
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                <div className="flex items-center justify-center gap-2 text-slate-700">
                  <span className="text-lg">📁</span>
                  <span className="text-xs font-bold">Upload Reference Documents / Briefs / Screenshots</span>
                  <span className="text-[11px] text-slate-400 font-normal">(PNG, JPG, PDF up to 5MB)</span>
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
              Select which editor will work on this content request. Submission is blocked until an editor is selected.
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
                <span>⚠️</span> You MUST select an editor before submitting bulk requests.
              </p>
            )}
          </div>

          {/* Parsed CSV Preview Table */}
          {csvPreview.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    CSV Rows Preview ({csvPreview.length} Content Requests Found)
                  </h3>
                  <p className="text-[11px] text-slate-400">Review parsed content requests before submitting.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCsvPreview([])}
                  className="text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl transition-all"
                >
                  Clear All Rows
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Sub Category</th>
                      <th className="p-3">Title & Requirements</th>
                      <th className="p-3">Keywords</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {csvPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {row.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{row.blog_category || '-'}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{row.title || 'Untitled Request'}</p>
                          {row.points_to_include && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{row.points_to_include}</p>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">{row.keywords || '-'}</td>
                        <td className="p-3 font-bold text-slate-800">{row.client_name || '-'}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            row.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-700'
                              : row.priority === 'high'
                              ? 'bg-amber-100 text-amber-700'
                              : row.priority === 'low'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {row.priority}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeCSVRow(idx)}
                            className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 border border-slate-200 flex items-center justify-center text-xs mx-auto"
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
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/design-requests" className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50">
              Cancel
            </Link>
            <button
              type="button"
              disabled={bulkLoading || !selectedDesigner || csvPreview.length === 0}
              onClick={handleSubmitBulk}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 ${
                selectedDesigner && csvPreview.length > 0
                  ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-900/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
              }`}
            >
              {bulkLoading
                ? 'Submitting Bulk Content Requests...'
                : selectedDesigner
                ? `🚀 Submit ${csvPreview.length} Content Requests (${selectedDesignerObj?.name || ''})`
                : '⚠️ Select an Editor First'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
