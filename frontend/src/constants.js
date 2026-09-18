// Friendly labels — UI me kabhi raw underscore values (team_lead) na dikhein
export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  team_lead: 'Team Lead',
  employee: 'Employee',
  developer: 'Developer',
  designer: 'Editor',
  editor: 'Editor',
  supervisor: 'Supervisor',
};

export const roleLabel = (r) => ROLE_LABELS[r] || r;

// Role create options (value = backend value, label = friendly)
export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'employee', label: 'Employee' },
  { value: 'developer', label: 'Developer' },
  { value: 'editor', label: 'Editor' },
  { value: 'supervisor', label: 'Supervisor' },
];

export const WORK_STATUS_OPTIONS = [
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const PRIORITY_STYLE = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

// Validation regexes for email and password
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// Developer Request Categories with dynamic placeholders, templates, tips & default priorities
export const DEV_CATEGORIES = [
  {
    value: 'hosting_server',
    label: 'Hosting / Server / DNS',
    icon: '🌐',
    desc: 'Server down, DNS config, downtime',
    defaultPriority: 'high',
    titlePlaceholder: 'e.g. Website Down / 503 Service Unavailable / DNS A Record update',
    descPlaceholder: '1. Impacted Domain / Server IP:\n2. Error message or downtime observed since:\n3. Hosting provider (cPanel, Hostinger, AWS):\n4. Actions needed (DNS record, reboot, PHP memory limit):',
    tip: '💡 Server Tip: If site is completely down or DNS records need updating, specify the nameservers/IP.',
  },
  {
    value: 'ssl_security',
    label: 'SSL / Security',
    icon: '🔒',
    desc: 'SSL expired, security warning, mixed content',
    defaultPriority: 'high',
    titlePlaceholder: 'e.g. SSL Certificate Expired / HTTPS "Not Secure" Warning / Mixed Content Error',
    descPlaceholder: '1. Exact SSL warning message shown:\n2. Specific HTTP URLs causing mixed content:\n3. SSL provider (Cloudflare, Let\'s Encrypt, Sectigo):\n4. Target expiration date:',
    tip: '💡 Security Tip: Please specify if the site is behind Cloudflare proxy or using origin SSL.',
  },
  {
    value: 'http_errors',
    label: '404 / 500 Page Errors',
    icon: '⚠️',
    desc: 'Broken links, server error codes, redirect loops',
    defaultPriority: 'medium',
    titlePlaceholder: 'e.g. 404 Page Not Found on /services / 500 Error during Form Submission',
    descPlaceholder: '1. Broken URLs returning 404 or 500 error:\n2. Correct target URL for 301 redirect:\n3. Where the broken link was discovered (GSC, internal link, backlink):\n4. Steps to trigger the error:',
    tip: '💡 404/500 Tip: Add all affected URLs in the "Affected Sites & URLs" section below.',
  },
  {
    value: 'speed_cwv',
    label: 'Speed & Core Web Vitals',
    icon: '⚡',
    desc: 'Slow loading, LCP/CLS optimization',
    defaultPriority: 'medium',
    titlePlaceholder: 'e.g. Mobile PageSpeed score below 35 / LCP over 4.2s on Homepage',
    descPlaceholder: '1. Target URLs needing speed optimization:\n2. Current PageSpeed / GTmetrix scores (Mobile vs Desktop):\n3. Problematic elements (heavy uncompressed images, unused JS/CSS, render blocking):\n4. Target performance benchmark (e.g. Mobile > 80):',
    tip: '💡 Speed Tip: Attach a screenshot or link of your Google PageSpeed Insights test.',
  },
  {
    value: 'cms_plugin',
    label: 'WordPress / Plugin / Theme',
    icon: '🧩',
    desc: 'Plugin crash, theme broken, CMS error',
    defaultPriority: 'medium',
    titlePlaceholder: 'e.g. Elementor update breaking homepage layout / Contact Form 7 not sending emails',
    descPlaceholder: '1. Plugin or Theme name & version:\n2. Exact broken layout or error notice:\n3. Steps to reproduce the bug:\n4. Was any recent plugin update or installation performed?',
    tip: '💡 CMS Tip: Provide temporary admin access in the Confidential Access Notes box below.',
  },
  {
    value: 'schema_meta',
    label: 'Schema / Meta / Tracking',
    icon: '🏷️',
    desc: 'GTM, Analytics, Meta tags, Schema markup',
    defaultPriority: 'low',
    titlePlaceholder: 'e.g. Implement FAQ Schema on /pricing / Google Tag Manager GA4 event not firing',
    descPlaceholder: '1. Schema type or Tracking tool (FAQ, Article, LocalBusiness, GA4, Meta Pixel):\n2. Target URL(s):\n3. Specific JSON-LD markup or GTM Container ID:\n4. Rich Results test error or expected trigger condition:',
    tip: '💡 Tracking Tip: Paste your GTM container ID or JSON-LD schema snippet in the description.',
  },
  {
    value: 'feature_request',
    label: 'New Page / Feature',
    icon: '🆕',
    desc: 'Landing page build, new section, form creation',
    defaultPriority: 'medium',
    titlePlaceholder: 'e.g. Build new Diwali Landing Page / Add WhatsApp Floating Chat Button',
    descPlaceholder: '1. Goal & purpose of the new page or feature:\n2. Target URL slug (e.g. /diwali-offer):\n3. Design reference / wireframe / doc link:\n4. Required form fields & lead notification email:',
    tip: '💡 Feature Tip: Attach layout screenshots, copy doc, or wireframes in Section 2.',
  },
  {
    value: 'other',
    label: 'Other Technical Issue',
    icon: '🛠️',
    desc: 'General technical problem',
    defaultPriority: 'medium',
    titlePlaceholder: 'e.g. Fix mobile viewport responsiveness / Search bar not returning results',
    descPlaceholder: '1. Describe the problem in detail:\n2. Expected behavior vs Actual behavior:\n3. Steps to reproduce the issue:\n4. Browser / Device on which error occurs:',
    tip: '💡 General Tip: The more context and screenshots you provide, the faster developers can resolve it.',
  },
];

export const devCategoryLabel = (cat) => {
  const match = DEV_CATEGORIES.find((c) => c.value === cat);
  return match ? `${match.icon} ${match.label}` : '🛠️ Other';
};

// Developer Request Status Map
export const DEV_STATUS_MAP = {
  submitted: { label: 'With Team Lead', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  tl_rejected: { label: 'Returned to Employee', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  forwarded: { label: 'With Developer', cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  in_progress: { label: 'In Progress ⚙️', cls: 'bg-amber-50 text-amber-700 border border-amber-300' },
  under_qa: { label: 'Under QA / Testing 🔍', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
  resolved: { label: 'Resolved ✅', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  reopened: { label: 'Reopened ⚠️', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
};

// Default Client Websites List for Searchable Dropdown
export const DEFAULT_WEBSITES = [
  { name: 'TechCrunch Inc', url: 'https://techcrunch.com' },
  { name: 'Fashion Hub Store', url: 'https://fashionhub.example.com' },
  { name: 'CloudSync Pro B2B', url: 'https://cloudsyncpro.example.com' },
  { name: 'Apex Health Solutions', url: 'https://apexhealth.example.com' },
  { name: 'SEO Growth Marketing', url: 'https://seomarketing.example.com' },
  { name: 'Global Logistics Portal', url: 'https://globallogistics.example.com' },
  { name: 'Digital Media Network', url: 'https://digitalmedia.example.com' },
  { name: 'Fintech Capital Hub', url: 'https://fintechcapital.example.com' },
  { name: 'E-Commerce Storefront', url: 'https://store.example.com' },
];


