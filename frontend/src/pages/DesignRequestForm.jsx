import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import SearchableSiteInput from '../components/SearchableSiteInput';

const CATEGORIES = [
  {
    id: 'Website Copy',
    label: 'Website & Landing Page Copy',
    desc: 'Hero headers, service page copy, value props & CTAs',
    icon: '📝',
    badge: 'Conversion Focused',
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
    border: 'border-blue-500/30',
    bgLight: 'bg-blue-50/50',
  },
  {
    id: 'Blog Content',
    label: 'SEO Blog & Article Content',
    desc: 'Informational guides, long-form articles & case studies',
    icon: '📚',
    badge: 'Search Optimized',
    gradient: 'from-indigo-600 via-purple-600 to-pink-600',
    border: 'border-purple-500/30',
    bgLight: 'bg-purple-50/50',
  },
  {
    id: 'Social Media & PR',
    label: 'Social Media & Ad Copy',
    desc: 'LinkedIn posts, IG captions, ad headlines & carousels',
    icon: '📢',
    badge: 'High Engagement',
    gradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    border: 'border-pink-500/30',
    bgLight: 'bg-pink-50/50',
  },
  {
    id: 'Email & PR',
    label: 'Email, PR & Whitepapers',
    desc: 'Newsletters, press releases, e-books & product briefs',
    icon: '✉️',
    badge: 'Enterprise Copy',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    border: 'border-teal-500/30',
    bgLight: 'bg-teal-50/50',
  },
];

const CATEGORY_CONFIG = {
  'Website Copy': {
    subCategoryLabel: 'Select Page Format',
    subCategories: [
      { id: 'Landing Page Copy', label: 'Landing Page Copy', desc: 'Hero headline, benefit points & conversion CTA', icon: '🎯' },
      { id: 'Service Page Content', label: 'Service Page Content', desc: 'Comprehensive service overview & features', icon: '🛠️' },
      { id: 'CTA & Offer Copy', label: 'CTA & Offer Banner Copy', desc: 'High-converting promo offer text', icon: '💡' },
      { id: 'About & Corporate Copy', label: 'About & Corporate Page', desc: 'Company history, mission & team profiles', icon: '🏢' },
    ],
    keywordsPlaceholder: 'e.g. SEO audit service, target audience, conversion copywriting, value proposition',
    titlePlaceholder: 'e.g. SEO Audit Service Landing Page Headline & Hero Section Copy',
    defaultWordCount: '500 - 800 words',
    templateText: `1. Target Audience: B2B decision makers & marketing directors\n2. Primary Headline: "Scale Your Organic Traffic by 300% in 90 Days"\n3. Key Value Props:\n   - Data-backed SEO audits\n   - Zero technical bloat\n   - Guaranteed keyword ranking improvement\n4. Call To Action (CTA): "Request Free Audit Today"`,
  },
  'Blog Content': {
    subCategoryLabel: 'Select Article Format',
    subCategories: [
      { id: 'Informational Guide', label: 'Informational Guide', desc: 'Educational how-to articles & comprehensive guides', icon: '📚' },
      { id: 'SEO Keyword Article', label: 'SEO Keyword Article', desc: 'Search engine optimized content targeting high-intent keywords', icon: '🔍' },
      { id: 'Case Study Content', label: 'Case Study Content', desc: 'Client success breakdown with metrics & data proof', icon: '📈' },
      { id: 'Glossary & Lexical', label: 'Glossary & Terminology', desc: 'Clear definitions for industry terms & lexical reference', icon: '🔤' },
    ],
    keywordsPlaceholder: 'e.g. backlink audit, technical seo, google indexing rate, search intent',
    titlePlaceholder: 'e.g. Top 10 High Authority SEO Backlink Strategies for 2026',
    defaultWordCount: '1500 - 2500 words',
    templateText: `1. Target Primary Keyword: "Technical SEO Audit Checklist"\n2. Proposed Word Count: 1800 words\n3. Article Outline:\n   - H1: Complete Technical SEO Audit Checklist for 2026\n   - H2: 1. Crawlability & Site Architecture\n   - H2: 2. Core Web Vitals & Page Speed\n   - H2: 3. Schema Markup & Structured Data\n4. Tone: Authoritative, Technical, Actionable`,
  },
  'Social Media & PR': {
    subCategoryLabel: 'Select Social / Ad Format',
    subCategories: [
      { id: 'LinkedIn Post Series', label: 'LinkedIn Post Series', desc: 'Professional thought leadership posts & carousels', icon: '📢' },
      { id: 'Ad Copy & Headlines', label: 'Google & Meta Ad Copy', desc: 'High-converting ad headlines, primary text & hooks', icon: '🎯' },
      { id: 'Instagram / X Caption', label: 'Social Captions', desc: 'Engaging short-form copy with hashtags & CTAs', icon: '📱' },
      { id: 'Press Release / PR', label: 'Official Press Release', desc: 'Newspaper & media announcement text', icon: '📰' },
    ],
    keywordsPlaceholder: 'e.g. linkedin post captions, google ads headline, press release, newsletter subject lines',
    titlePlaceholder: 'e.g. 5 Essential On-Page SEO Checklist LinkedIn Post & Caption Series',
    defaultWordCount: '300 - 600 words',
    templateText: `1. Platform: LinkedIn & Twitter/X\n2. Post Hook: "90% of websites fail technical SEO audits for 3 stupid reasons."\n3. Key Points:\n   - Reason 1: Unindexed Javascript renders\n   - Reason 2: Broken canonical tags\n   - Reason 3: Heavy uncompressed image assets\n4. Call To Action & Link: "Read the full 2026 audit guide link in comments👇"`,
  },
  'Email & PR': {
    subCategoryLabel: 'Select Email / Publication Format',
    subCategories: [
      { id: 'Email Newsletter', label: 'Email Newsletter Copy', desc: 'Weekly subscriber newsletter body & subject lines', icon: '✉️' },
      { id: 'Whitepaper / E-Book', label: 'Whitepaper / E-Book', desc: 'In-depth downloadable industry report copy', icon: '📑' },
      { id: 'Sales Pitch Copy', label: 'Sales Email Sequence', desc: 'Cold outreach & warm lead follow-up emails', icon: '💼' },
      { id: 'Product Description', label: 'Product Specs & Copy', desc: 'E-commerce product descriptions & spec sheets', icon: '🛍️' },
    ],
    keywordsPlaceholder: 'e.g. B2B email sequence, newsletter subject lines, whitepaper overview',
    titlePlaceholder: 'e.g. Q4 SEO Trends & AI Search Impact Email Newsletter Brief',
    defaultWordCount: '800 - 1200 words',
    templateText: `1. Subject Line Options:\n   - "Is AI Search destroying your organic traffic?"\n   - "3 SEO adjustments you must make before Q4"\n2. Preview Text: "Here is what Google\'s newest update means for your site."\n3. Email Body Outline:\n   - Opening hook & industry context\n   - 3 actionable takeaways\n   - CTA button: "Book Strategy Call"`,
  },
};

const TONE_OPTIONS = [
  { id: 'Professional & B2B', label: '💼 Professional & B2B', desc: 'Formal, authoritative & corporate' },
  { id: 'Conversational & Friendly', label: '💬 Conversational', desc: 'Engaging, warm & accessible' },
  { id: 'Persuasive & High-Converting', label: '⚡ High Converting', desc: 'Direct, benefit-focused & persuasive' },
  { id: 'Educational & Technical', label: '🎓 Educational & Technical', desc: 'In-depth, data-backed & analytical' },
];

const WORD_COUNT_OPTIONS = [
  '300 - 500 words',
  '800 - 1200 words',
  '1500 - 2000 words',
  '2500+ words (Longform)',
];

export default function DesignRequestForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  // Editors/Writers List & Selected Assignee
  const [designers, setDesigners] = useState([]);
  const [selectedDesigner, setSelectedDesigner] = useState('');

  // Form State
  const [category, setCategory] = useState('Website Copy');
  const [blogCategory, setBlogCategory] = useState('Landing Page Copy');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('Professional & B2B');
  const [wordCount, setWordCount] = useState('800 - 1200 words');
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
    ? { id: 'all', name: 'All Content Writers (Whole Team)' }
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
    if (newConfig.defaultWordCount) {
      setWordCount(newConfig.defaultWordCount);
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

  // Submit Single Content Request Form
  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedDesigner) {
      setError('Please select a Content Writer before submitting this request.');
      return;
    }

    setLoading(true);
    try {
      // Structure the enterprise brief inside points_to_include
      const formattedBrief = `Target Tone: ${toneOfVoice}\nWord Count: ${wordCount}\n\nBrief & Guidelines:\n${pointsToInclude.trim() || 'No specific outline provided.'}`;

      const payload = {
        category,
        blog_category: blogCategory || null,
        title: title.trim() || null,
        keywords: keywords.trim() || null,
        points_to_include: formattedBrief,
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

  // Insert Template Text into Brief
  const handleInsertTemplate = () => {
    if (currentConfig.templateText) {
      setPointsToInclude(currentConfig.templateText);
    }
  };

  // Enterprise Sample CSV Template Downloader
  const downloadCSVTemplte = () => {
    const csvContent =
      'category,sub_category,title,keywords,target_word_count,tone_of_voice,target_audience,content_brief,priority,site_url,due_date\n' +
      '"Website Copy","Landing Page Copy","SEO Audit Landing Page Copy","seo audit, conversion copy","500 - 800 words","Professional & B2B","B2B Marketing Directors","1. Hero section headline\\n2. 3 Benefit points\\n3. CTA: Request Free Audit","high","https://apexhealth.example.com","2026-10-01"\n' +
      '"Blog Content","SEO Keyword Article","Top 10 High Authority SEO Strategies","backlink audit, technical seo","1500 - 2000 words","Educational & Technical","SEO Specialists","1. 1800 words longform guide\\n2. H2 & H3 outline with keyword placement","medium","https://cloudsyncpro.example.com","2026-10-05"\n' +
      '"Social Media & PR","LinkedIn Post Series","5 Essential Technical SEO Tips","linkedin caption, technical checklist","300 - 500 words","Conversational & Friendly","LinkedIn Professionals","1. 5-slide post hook\\n2. 3 Key technical reasons\\n3. Link in comments CTA","urgent","https://techcrunch.com","2026-10-08"\n' +
      '"Email & PR","Email Newsletter","Q4 SEO Trends & AI Search Impact","ai search, Q4 seo trends","800 - 1200 words","Persuasive & High-Converting","Email Subscribers","1. 2 Subject lines\\n2. Industry news hook\\n3. Book strategy call CTA","medium","https://marketingpro.example.com","2026-10-12"';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'content_requests_enterprise_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV File for Enterprise Content Fields
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

  // Robust CSV Parser mapping Enterprise Content Fields
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

      if (row.category || row.title || row.keywords || row.content_brief || row.points_to_include || row.site_url) {
        let cat = row.category || 'Blog Content';
        const lowerCat = cat.toLowerCase();
        if (lowerCat.includes('website') || lowerCat.includes('page') || lowerCat.includes('landing') || lowerCat.includes('copy')) cat = 'Website Copy';
        else if (lowerCat.includes('blog') || lowerCat.includes('article') || lowerCat.includes('seo')) cat = 'Blog Content';
        else if (lowerCat.includes('social') || lowerCat.includes('ad') || lowerCat.includes('caption')) cat = 'Social Media & PR';
        else if (lowerCat.includes('email') || lowerCat.includes('pr') || lowerCat.includes('whitepaper')) cat = 'Email & PR';

        let subCat = row.sub_category || row.subcategory || row.blog_category || row.blogcategory || '';
        if (!subCat) {
          if (cat === 'Website Copy') subCat = 'Landing Page Copy';
          else if (cat === 'Blog Content') subCat = 'SEO Keyword Article';
          else if (cat === 'Social Media & PR') subCat = 'LinkedIn Post Series';
          else subCat = 'Email Newsletter';
        }

        const briefPart = row.content_brief || row.points_to_include || row.brief || '';
        const tonePart = row.tone_of_voice || row.tone || '';
        const wordCountPart = row.target_word_count || row.word_count || '';
        const audiencePart = row.target_audience || row.audience || '';

        let compiledBrief = '';
        if (tonePart) compiledBrief += `Tone: ${tonePart}\n`;
        if (wordCountPart) compiledBrief += `Word Count: ${wordCountPart}\n`;
        if (audiencePart) compiledBrief += `Target Audience: ${audiencePart}\n`;
        if (compiledBrief && briefPart) compiledBrief += `\nBrief:\n${briefPart}`;
        else if (!compiledBrief) compiledBrief = briefPart;

        rows.push({
          id: i,
          category: cat,
          blog_category: subCat,
          title: row.title || 'Untitled Content Brief',
          keywords: row.keywords || row.primary_keywords || '',
          points_to_include: compiledBrief,
          priority: ['low', 'medium', 'high', 'urgent'].includes((row.priority || '').toLowerCase())
            ? row.priority.toLowerCase()
            : 'medium',
          client_name: row.site_url || row.siteurl || row.url || row.client_name || row.client || '',
          due_date: row.due_date || row.duedate || row.target_date || '',
          word_count: wordCountPart,
          tone: tonePart,
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
      setBulkError('Please select a Content Writer before submitting bulk requests.');
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
    <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-12">
      {/* Sleek Enterprise Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop decorative effect */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/design-requests" className="text-slate-400 hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5">
                <span>←</span> Content Requests Hub
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 text-white flex items-center gap-3">
              <span className="p-2 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white shadow-lg text-xl">✍️</span>
              <span>Content Creation Studio</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Order professional website copy, SEO articles, social media campaigns & marketing briefs.
            </p>
          </div>

          {/* Mode Selector Tabs & Template Download */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shrink-0 shadow-inner">
            <button
              type="button"
              onClick={downloadCSVTemplte}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-indigo-300 hover:text-white bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Download Sample CSV Template for Excel"
            >
              <span>📥</span> Download CSV Template
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'single'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>✏️</span> Single Brief
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bulk')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'bulk'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
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
        <form onSubmit={handleSubmitSingle} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
              <span>⚠️ {error}</span>
              <button type="button" onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 font-extrabold">
                ✕
              </button>
            </div>
          )}

          {/* STEP 1: CONTENT TYPE & FORMAT */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">1</span>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Select Content Category & Format</h2>
                  <p className="text-[11px] text-slate-400">Choose primary category to adapt word count, tone and outlines</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 1 of 5</span>
            </div>

            {/* Primary Category Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {CATEGORIES.map((c) => {
                const isActive = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryChange(c.id)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between relative cursor-pointer group ${
                      isActive
                        ? `${c.border} ${c.bgLight} ring-2 ring-indigo-500/25 shadow-md transform -translate-y-0.5`
                        : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/80 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${c.gradient} flex items-center justify-center text-white text-base shadow-sm shrink-0 group-hover:scale-105 transition-transform`}>
                          {c.icon}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isActive
                            ? 'bg-indigo-600 text-white border-transparent'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {c.badge}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-xs text-slate-900 leading-snug">{c.label}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">{c.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Sub-Category Pills Grid */}
            {currentConfig.subCategories && currentConfig.subCategories.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <span>↳ {currentConfig.subCategoryLabel}:</span>
                  </label>
                  <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                    Tailored for {category}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {currentConfig.subCategories.map((sc) => {
                    const isActive = blogCategory === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setBlogCategory(sc.id)}
                        className={`p-3 rounded-2xl border text-left transition-all duration-150 flex items-start gap-2.5 cursor-pointer ${
                          isActive
                            ? 'border-indigo-600 bg-white text-indigo-950 ring-2 ring-indigo-500/20 shadow-md font-extrabold'
                            : 'border-slate-200/90 hover:border-slate-300 bg-slate-50/50 hover:bg-white text-slate-800'
                        }`}
                      >
                        <span className="text-lg shrink-0 mt-0.5">{sc.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 block truncate">{sc.label}</span>
                            {isActive && <span className="text-indigo-600 font-extrabold text-xs shrink-0 ml-1">✓</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sc.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: TOPIC TITLE & SEO KEYWORDS */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">2</span>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Topic Title & SEO Keywords</h2>
                  <p className="text-[11px] text-slate-400">Specify main title and search keywords to target</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 2 of 5</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Content Title / Main Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={currentConfig.titlePlaceholder}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs font-bold bg-slate-50/40 focus:bg-white transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Target SEO Keywords (Comma Separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder={currentConfig.keywordsPlaceholder}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs font-mono bg-slate-50/40 focus:bg-white transition-all shadow-xs text-indigo-950"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: TONE OF VOICE & WORD COUNT */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">3</span>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Tone of Voice & Target Word Count</h2>
                  <p className="text-[11px] text-slate-400">Set writing style parameters and word length requirements</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 3 of 5</span>
            </div>

            <div className="space-y-4 pt-1">
              {/* Tone Selection Pills */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-2">Target Tone of Voice</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {TONE_OPTIONS.map((t) => {
                    const isSel = toneOfVoice === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setToneOfVoice(t.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs font-extrabold'
                            : 'border-slate-200/90 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <p className="text-xs font-extrabold truncate">{t.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Word Count Chips */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-2">Target Word Count Length</label>
                <div className="flex flex-wrap items-center gap-2">
                  {WORD_COUNT_OPTIONS.map((wc) => {
                    const isSel = wordCount === wc;
                    return (
                      <button
                        key={wc}
                        type="button"
                        onClick={() => setWordCount(wc)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSel
                            ? 'border-brand-600 bg-brand-600 text-white shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
                        }`}
                      >
                        📏 {wc}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: CONTENT BRIEF & SPECIFIC OUTLINE */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">4</span>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Detailed Content Brief & Instructions</h2>
                  <p className="text-[11px] text-slate-400">Specify article outline, key takeaways, CTAs or competitor references</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleInsertTemplate}
                className="text-xs font-extrabold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span>⚡</span> Insert {category} Brief Guidelines
              </button>
            </div>

            <textarea
              rows={5}
              value={pointsToInclude}
              onChange={(e) => setPointsToInclude(e.target.value)}
              placeholder={`Specify detailed content brief for ${category}:\n${currentConfig.templateText}`}
              className="w-full p-4 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs font-sans bg-slate-50/30 focus:bg-white leading-relaxed text-slate-800 shadow-xs"
            />
          </div>

          {/* STEP 5: TARGET URL & DELIVERY SETTINGS */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Target Website URL & Priority Settings
                </h3>
                <p className="text-[11px] text-slate-400">Link target website, set priority level and attach reference documents</p>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 5 of 5</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs font-bold bg-slate-50/40 focus:bg-white transition-all shadow-xs"
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🔴 High Priority</option>
                  <option value="urgent">🔥 Urgent Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">Target Website URL (Dropdown List)</label>
                <SearchableSiteInput
                  value={clientName}
                  onChange={(val) => setClientName(val)}
                  placeholder="Search or select site URL..."
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">Target Delivery Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs font-bold bg-slate-50/40 focus:bg-white transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Reference Attachment Box */}
            <div>
              <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-4 text-center block cursor-pointer transition-all bg-slate-50/40 hover:bg-indigo-50/20">
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                <div className="flex items-center justify-center gap-2 text-slate-700">
                  <span className="text-xl">📁</span>
                  <span className="text-xs font-extrabold">Upload Reference Docs / Content Outlines / Briefs</span>
                  <span className="text-[11px] text-slate-400 font-normal">(PNG, JPG, PDF, DOCX up to 5MB)</span>
                </div>
              </label>

              {attachments.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-3">
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

          {/* SELECT CONTENT WRITER / ASSIGNEE (MANDATORY) */}
          <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-slate-50 p-6 sm:p-7 rounded-3xl border border-indigo-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">✍️</span>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-indigo-950">
                    Select Content Writer / Assignee <span className="text-rose-500">*</span>
                  </h2>
                  <p className="text-[11px] text-indigo-700">Assign a specific writer or choose "All Content Writers" to broadcast request.</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-indigo-700 bg-white px-3 py-1 rounded-xl border border-indigo-200 shadow-xs">
                {designers.length} Writer{designers.length !== 1 ? 's' : ''} Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {/* Broadcast Option */}
              <button
                type="button"
                onClick={() => { setSelectedDesigner('all'); setError(''); }}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  selectedDesigner === 'all'
                    ? 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-500/40 shadow-md font-extrabold'
                    : 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-950 font-bold'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs ${selectedDesigner === 'all' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'}`}>
                  👥
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-xs truncate">All Content Writers (Whole Team)</p>
                    {selectedDesigner === 'all' && <span className="text-white font-bold text-xs shrink-0 ml-1">✓</span>}
                  </div>
                  <p className={`text-[10px] font-mono truncate ${selectedDesigner === 'all' ? 'text-indigo-100' : 'text-indigo-600'}`}>
                    Broadcast request to all active writers
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
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      isSel
                        ? 'border-indigo-600 bg-white text-indigo-950 ring-2 ring-indigo-500/30 shadow-md font-extrabold'
                        : 'border-indigo-100 hover:border-indigo-300 bg-white/80 hover:bg-white text-slate-800'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      ✍️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-extrabold text-xs text-slate-900 truncate">{d.name}</p>
                        {isSel && <span className="text-indigo-600 font-bold text-xs shrink-0 ml-1">✓</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono truncate">@{d.username} • [{d.role?.toUpperCase() || 'WRITER'}]</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {!selectedDesigner && (
              <p className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 flex items-center gap-1.5 mt-2">
                <span>⚠️</span> You MUST select a writer or "All Content Writers" before submitting this request.
              </p>
            )}
          </div>

          {/* Floating Action Bar */}
          <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <p className="font-extrabold text-slate-800">Ready to launch content request?</p>
              <p>
                {selectedDesignerObj
                  ? `Request will be sent to ${selectedDesignerObj.name} with priority: `
                  : 'Please select a content writer above first. Priority: '}
                <b className="capitalize text-slate-900">{priority}</b>.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link to="/design-requests" className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 text-center">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !selectedDesigner}
                className={`w-full sm:w-auto px-7 py-3 rounded-2xl font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                  selectedDesigner
                    ? 'bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white shadow-indigo-950/20 transform hover:-translate-y-0.5'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
                }`}
              >
                {loading
                  ? 'Submitting Request...'
                  : selectedDesignerObj
                  ? `🚀 Submit Content Request (${selectedDesignerObj.name})`
                  : '⚠️ Select a Content Writer First'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* BULK CSV UPLOAD MODE */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          {bulkError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
              <span>⚠️ {bulkError}</span>
              <button type="button" onClick={() => setBulkError('')} className="text-rose-400 hover:text-rose-600 font-extrabold">
                ✕
              </button>
            </div>
          )}

          {bulkSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
              <span>✅</span>
              <span>{bulkSuccess}</span>
            </div>
          )}

          {/* File Upload Zone */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-base">📊</span>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Upload Bulk Enterprise CSV File</h2>
                  <p className="text-[11px] text-slate-400">Download the enterprise CSV template, fill topics and details, and upload below.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={downloadCSVTemplte}
                className="text-xs font-extrabold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span>📥</span> Download Enterprise CSV Template
              </button>
            </div>

            <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/20 rounded-3xl p-8 sm:p-10 text-center block cursor-pointer transition-all hover:bg-indigo-50/40">
              <input type="file" accept=".csv,text/csv,application/vnd.ms-excel" onChange={handleCSVFileChange} className="hidden" />
              <div className="space-y-2">
                <span className="text-4xl block">📄</span>
                <p className="text-sm font-extrabold text-slate-800">
                  {csvFile ? `Selected File: ${csvFile.name}` : 'Click or Drag Enterprise CSV File Here to Upload'}
                </p>
                <p className="text-xs text-slate-500">Supports standard CSV exported from Excel or Google Sheets</p>
              </div>
            </label>
          </div>

          {/* SELECT CONTENT WRITER FOR BULK */}
          <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-slate-50 p-6 sm:p-7 rounded-3xl border border-indigo-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">👥</span>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-indigo-950">
                    Select Content Writer for Bulk Upload <span className="text-rose-500">*</span>
                  </h2>
                  <p className="text-[11px] text-indigo-700">Assign all CSV items to a specific writer or choose "All Content Writers".</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-indigo-700 bg-white px-3 py-1 rounded-xl border border-indigo-200 shadow-xs">
                {designers.length} Writer{designers.length !== 1 ? 's' : ''} Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setSelectedDesigner('all'); setBulkError(''); }}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  selectedDesigner === 'all'
                    ? 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-500/40 shadow-md font-extrabold'
                    : 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-950 font-bold'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs ${selectedDesigner === 'all' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'}`}>
                  👥
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-xs truncate">All Content Writers (Whole Team)</p>
                    {selectedDesigner === 'all' && <span className="text-white font-bold text-xs shrink-0 ml-1">✓</span>}
                  </div>
                  <p className={`text-[10px] font-mono truncate ${selectedDesigner === 'all' ? 'text-indigo-100' : 'text-indigo-600'}`}>
                    Broadcast request to all active writers
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
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      isSel
                        ? 'border-indigo-600 bg-white text-indigo-950 ring-2 ring-indigo-500/30 shadow-md font-extrabold'
                        : 'border-indigo-100 hover:border-indigo-300 bg-white/80 hover:bg-white text-slate-800'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      ✍️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-extrabold text-xs text-slate-900 truncate">{d.name}</p>
                        {isSel && <span className="text-indigo-600 font-bold text-xs shrink-0 ml-1">✓</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono truncate">@{d.username} • [{d.role?.toUpperCase() || 'WRITER'}]</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {!selectedDesigner && (
              <p className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 flex items-center gap-1.5 mt-2">
                <span>⚠️</span> You MUST select a writer before submitting bulk requests.
              </p>
            )}
          </div>

          {/* Parsed CSV Preview Table */}
          {csvPreview.length > 0 && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                    CSV Rows Preview ({csvPreview.length} Enterprise Content Requests Found)
                  </h3>
                  <p className="text-[11px] text-slate-400">Review parsed content briefs and keywords before submitting.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCsvPreview([])}
                  className="text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-xl transition-all"
                >
                  Clear All Rows
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase font-extrabold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Category & Format</th>
                      <th className="p-3">Title & Brief Overview</th>
                      <th className="p-3">SEO Keywords</th>
                      <th className="p-3">Target Site Link</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {csvPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-extrabold text-indigo-950">{row.category}</p>
                          <p className="text-[10px] text-indigo-600 font-semibold">{row.blog_category || '-'}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{row.title || 'Untitled Brief'}</p>
                          {row.points_to_include && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 whitespace-pre-line">{row.points_to_include}</p>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-700">{row.keywords || '-'}</td>
                        <td className="p-3">
                          <p className="font-bold text-brand-600 font-mono text-[11px] truncate max-w-[180px]">
                            {row.client_name || '-'}
                          </p>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
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
                            className="w-7 h-7 rounded-xl text-rose-500 hover:bg-rose-50 border border-slate-200 flex items-center justify-center text-xs mx-auto"
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
          <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <p className="font-extrabold text-slate-800">Ready to launch bulk content requests?</p>
              <p>
                {csvPreview.length > 0
                  ? `${csvPreview.length} content request${csvPreview.length !== 1 ? 's' : ''} ready to submit ${selectedDesignerObj ? `to ${selectedDesignerObj.name}` : 'to content team'}.`
                  : 'Please upload an enterprise CSV file above.'}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link to="/design-requests" className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 text-center">
                Cancel
              </Link>
              <button
                type="button"
                disabled={bulkLoading || !selectedDesigner || csvPreview.length === 0}
                onClick={handleSubmitBulk}
                className={`w-full sm:w-auto px-7 py-3 rounded-2xl font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                  selectedDesigner && csvPreview.length > 0
                    ? 'bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white shadow-indigo-950/20 transform hover:-translate-y-0.5'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
                }`}
              >
                {bulkLoading
                  ? 'Submitting Bulk Requests...'
                  : selectedDesigner
                  ? `🚀 Submit ${csvPreview.length} Bulk Requests (${selectedDesignerObj?.name || ''})`
                  : '⚠️ Select a Writer First'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
