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
  // Health & Medical
  { name: 'Apex Health Solutions', url: 'https://apexhealth.example.com' },
  { name: 'Metro Dental Care & Clinic', url: 'https://metrodental.example.com' },
  { name: 'Zenith Pharma & Research Labs', url: 'https://zenithpharma.example.com' },
  { name: 'MedPlus Specialty Hospitals', url: 'https://medplushospitals.example.com' },
  { name: 'CareFirst Diagnostic Center', url: 'https://carefirstlabs.example.com' },
  { name: 'Pulse Heart & Cardiac Care', url: 'https://pulsecardiac.example.com' },
  { name: 'Aura Skin & Cosmetic Surgery', url: 'https://auraskincare.example.com' },
  { name: 'VisionCare Eye Hospital', url: 'https://visioncareeye.example.com' },

  // E-Commerce & Retail
  { name: 'Fashion Hub Store', url: 'https://fashionhub.example.com' },
  { name: 'E-Commerce Global Storefront', url: 'https://store.example.com' },
  { name: 'Crown Jewelers & Luxury', url: 'https://crownjewelers.example.com' },
  { name: 'Organic Foods Express', url: 'https://organicfoodsexpress.example.com' },
  { name: 'Urban Style Apparel', url: 'https://urbanstyle.example.com' },
  { name: 'KiddyZone Toys & Apparel', url: 'https://kiddyzone.example.com' },
  { name: 'HomeDecor Furnishings Direct', url: 'https://homedecordirect.example.com' },
  { name: 'GadgetGalaxy Electronics', url: 'https://gadgetgalaxy.example.com' },
  { name: 'Footwear Nation', url: 'https://footwearnation.example.com' },

  // Tech, SaaS & IT Services
  { name: 'TechCrunch Inc', url: 'https://techcrunch.com' },
  { name: 'CloudSync Pro B2B', url: 'https://cloudsyncpro.example.com' },
  { name: 'Vanguard Cyber Security', url: 'https://vanguardcyber.example.com' },
  { name: 'HyperDrive Gaming Cloud', url: 'https://hyperdrivegaming.example.com' },
  { name: 'Pure Water Tech Solutions', url: 'https://purewatertech.example.com' },
  { name: 'DataCore AI Systems', url: 'https://datacoreai.example.com' },
  { name: 'DevOps Cloud Solutions', url: 'https://devopscloud.example.com' },
  { name: 'CyberShield IT Services', url: 'https://cybershieldit.example.com' },
  { name: 'SaaSFlow Automation', url: 'https://saasflow.example.com' },
  { name: 'CodeKraft Software Labs', url: 'https://codekraftlabs.example.com' },

  // SEO, Marketing & Media
  { name: 'SEO Growth Marketing Agency', url: 'https://seomarketing.example.com' },
  { name: 'Digital Media Network Hub', url: 'https://digitalmedia.example.com' },
  { name: 'Starlight Media Studios', url: 'https://starlightmedia.example.com' },
  { name: 'BrandVibe Digital Agency', url: 'https://brandvibe.example.com' },
  { name: 'AdPulse Marketing Solutions', url: 'https://adpulse.example.com' },
  { name: 'ClickRight Performance Media', url: 'https://clickright.example.com' },
  { name: 'ContentForge Copywriting', url: 'https://contentforge.example.com' },
  { name: 'ViralReach Social Agency', url: 'https://viralreach.example.com' },

  // Real Estate, Architecture & Construction
  { name: 'Urban Real Estate Properties', url: 'https://urbanrealestate.example.com' },
  { name: 'Skyline Construction & Infra', url: 'https://skylineconstruction.example.com' },
  { name: 'Apex Luxury Apartments', url: 'https://apexapartments.example.com' },
  { name: 'Prestige Commercial Spaces', url: 'https://prestigecommercial.example.com' },
  { name: 'ArchCraft Interior Designers', url: 'https://archcraftinteriors.example.com' },
  { name: 'GreenHomes Eco Builders', url: 'https://greenhomeseco.example.com' },
  { name: 'Landmark Developers & Builders', url: 'https://landmarkbuilders.example.com' },

  // Finance, Banking & Legal
  { name: 'Fintech Capital Hub', url: 'https://fintechcapital.example.com' },
  { name: 'Apex Legal & Partners LLP', url: 'https://apexlegal.example.com' },
  { name: 'Blue Horizon Capital & Advisory', url: 'https://bluehorizon.example.com' },
  { name: 'TrustWealth Asset Management', url: 'https://trustwealth.example.com' },
  { name: 'PayExpress Merchant Gateway', url: 'https://payexpress.example.com' },
  { name: 'TaxBuddy Chartered Accountants', url: 'https://taxbuddyca.example.com' },
  { name: 'SecureInsure Policy Brokers', url: 'https://secureinsure.example.com' },
  { name: 'Prime Mutual Funds', url: 'https://primemutual.example.com' },

  // Travel, Hospitality & Events
  { name: 'Hospitality & Resort Group', url: 'https://hospitalitygroup.example.com' },
  { name: 'Travelers Journey Tours & Travels', url: 'https://travelersjourney.example.com' },
  { name: 'Grand Royale Hotel & Spa', url: 'https://grandroyalehotel.example.com' },
  { name: 'FlyGlobal Booking Portal', url: 'https://flyglobalbooking.example.com' },
  { name: 'Celebration Event Planners', url: 'https://celebrationevents.example.com' },
  { name: 'Safari Expedition Club', url: 'https://safariexpedition.example.com' },
  { name: 'Destination Weddings India', url: 'https://destinationweddings.example.com' },

  // Automotive, Transport & Logistics
  { name: 'Global Logistics Portal', url: 'https://globallogistics.example.com' },
  { name: 'NextGen Auto Spares & Parts', url: 'https://nextgenauto.example.com' },
  { name: 'Prime Logistics & Cargo Services', url: 'https://primelogistics.example.com' },
  { name: 'SpeedyWheels Car Rental', url: 'https://speedywheels.example.com' },
  { name: 'TransIndia Freight Carriers', url: 'https://transindiafreight.example.com' },
  { name: 'EV Motors Tech Drive', url: 'https://evmotorstech.example.com' },

  // Education, Training & HR
  { name: 'EduLearn Global Academy', url: 'https://edulearn.example.com' },
  { name: 'SkillSet Technical Institute', url: 'https://skillsetinstitute.example.com' },
  { name: 'CareerPath Overseas Education', url: 'https://careerpathedu.example.com' },
  { name: 'TalentHire Staffing Solutions', url: 'https://talenthirehr.example.com' },
  { name: 'BrightMinds Preschool Chain', url: 'https://brightmindspreschool.example.com' },

  // Energy, Environment & Agriculture
  { name: 'Solaris Clean Energy Solutions', url: 'https://solarisenergy.example.com' },
  { name: 'Green Earth Waste Recycling', url: 'https://greenearth.example.com' },
  { name: 'AgriTech Farmers Portal', url: 'https://agritechfarmers.example.com' },
  { name: 'EcoSolar Power Systems', url: 'https://ecosolarpower.example.com' },
  { name: 'PureHarvest Organics', url: 'https://pureharvest.example.com' },

  // Fitness, Lifestyle & Beauty
  { name: 'Fitness First Wellness Club', url: 'https://fitnessfirst.example.com' },
  { name: 'Zen Spa & Wellness Retreat', url: 'https://zenspawellness.example.com' },
  { name: 'GlowSalon Beauty & Hair', url: 'https://glowsalon.example.com' },
  { name: 'FitGym CrossFit Studio', url: 'https://fitgymcrossfit.example.com' },
];



