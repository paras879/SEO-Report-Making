// Friendly labels — UI me kabhi raw underscore values (team_lead) na dikhein
export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  team_lead: 'Team Lead',
  employee: 'Employee',
  developer: 'Developer',
};

export const roleLabel = (r) => ROLE_LABELS[r] || r;

// Role create options (value = backend value, label = friendly)
export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'employee', label: 'Employee' },
  { value: 'developer', label: 'Developer' },
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

// Developer Request Categories
export const DEV_CATEGORIES = [
  { value: 'hosting_server', label: 'Hosting / Server / DNS', icon: '🌐', desc: 'Server down, DNS config, downtime' },
  { value: 'ssl_security', label: 'SSL / Security', icon: '🔒', desc: 'SSL expired, security warning, mixed content' },
  { value: 'http_errors', label: '404 / 500 Page Errors', icon: '⚠️', desc: 'Broken links, server error codes, redirect loops' },
  { value: 'speed_cwv', label: 'Speed & Core Web Vitals', icon: '⚡', desc: 'Slow loading, LCP/CLS optimization' },
  { value: 'cms_plugin', label: 'WordPress / Plugin / Theme', icon: '🧩', desc: 'Plugin crash, theme broken, CMS error' },
  { value: 'schema_meta', label: 'Schema / Meta / Tracking', icon: '🏷️', desc: 'GTM, Analytics, Meta tags, Schema markup' },
  { value: 'feature_request', label: 'New Page / Feature', icon: '🆕', desc: 'Landing page build, new section, form creation' },
  { value: 'other', label: 'Other Technical Issue', icon: '🛠️', desc: 'General technical problem' },
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


