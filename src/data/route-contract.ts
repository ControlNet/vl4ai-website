export interface PublicRouteContractEntry {
  id: 'home' | 'people' | 'research' | 'publications' | 'news' | 'positions' | 'contact' | 'not-found';
  path: '/' | '/people/' | '/research/' | '/publications/' | '/news/' | '/positions/' | '/contact/' | '/404.html';
  kind: 'landing' | 'archive' | 'system';
  title: string;
  summary: string;
}

export interface NavContractItem {
  key: string;
  label: string;
  href: string;
  testId: string;
}

export interface NavContractCta {
  label: string;
  href: string;
  testId: string;
}

export const publicRouteContract: PublicRouteContractEntry[] = [
  {
    id: 'home',
    path: '/',
    kind: 'landing',
    title: 'Homepage',
    summary: 'Primary landing route for the VL4AI site.',
  },
  {
    id: 'people',
    path: '/people/',
    kind: 'landing',
    title: 'People',
    summary:
      'Canonical standalone route for lab members, alumni, and related people content.',
  },
  {
    id: 'research',
    path: '/research/',
    kind: 'landing',
    title: 'Research',
    summary: 'Canonical standalone route for research areas, topics, and benchmark overviews.',
  },
  {
    id: 'publications',
    path: '/publications/',
    kind: 'archive',
    title: 'Publications',
    summary:
      'Canonical standalone archive route backed by the local publications collection.',
  },
  {
    id: 'news',
    path: '/news/',
    kind: 'archive',
    title: 'News',
    summary: 'Canonical standalone archive route backed by the local news collection.',
  },
  {
    id: 'positions',
    path: '/positions/',
    kind: 'landing',
    title: 'Positions',
    summary: 'Canonical standalone route for recruitment, openings, and hiring information.',
  },
  {
    id: 'contact',
    path: '/contact/',
    kind: 'landing',
    title: 'Contact',
    summary: 'Canonical standalone route for address, map, and direct contact details.',
  },
  {
    id: 'not-found',
    path: '/404.html',
    kind: 'system',
    title: 'Not found',
    summary:
      'Static fallback for unsupported or retired routes. Legacy migration work should point nowhere else unless the contract is updated explicitly.',
  },
];

export const publicNavItems: NavContractItem[] = [
  { key: 'people', label: 'People', href: '/people/', testId: 'site-nav-link-people' },
  { key: 'research', label: 'Research', href: '/research/', testId: 'site-nav-link-research' },
  {
    key: 'publications',
    label: 'Publications',
    href: '/publications/',
    testId: 'site-nav-link-publications',
  },
  { key: 'news', label: 'News', href: '/news/', testId: 'site-nav-link-news' },
  { key: 'positions', label: 'Join us', href: '/positions/', testId: 'site-nav-link-positions' },
  { key: 'contact', label: 'Contact', href: '/contact/', testId: 'site-nav-link-contact' },
];

/** Canonical contact href/label (footer meta, redirects). Nav uses `publicNavItems` entry `key: 'contact'`. */
export const navContactCta: NavContractCta = {
  label: 'Contact',
  href: '/contact/',
  testId: 'site-nav-link-contact',
};

export const footerUtilityLink: NavContractCta = {
  label: 'Contact VL4AI Research',
  href: '/contact/',
  testId: 'footer-contact-link',
};

export const unsupportedLegacyRoutePaths = [
  '/people.html',
  '/research.html',
  '/publications.html',
  '/news.html',
  '/positions.html',
  '/contact.html',
  '/gallery.html',
  '/teaching.html',
  '/pages/LISC.html',
  '/pages/PHD-NSL.html',
  '/pages/RF-ANSR.html',
  '/pages/RA-CCU.html',
  '/pages/RA-LLwL-OD.html',
  '/pages/RA-DP-VN.html',
  '/pages/RA-LLwL-VC.html',
] as const;

export const staticGenerationAssumptions = [
  'The canonical public IA targets the slash-route matrix /, /people/, /research/, /publications/, /news/, /positions/, /contact/, and /404.html.',
  'News and publications are archive index routes only. No /news/[slug]/ or /publications/[slug]/ detail pages are supported in the canonical contract.',
  'Primary navigation, footer navigation, and parity checks should target slash routes instead of homepage hash anchors.',
  'If a later task introduces year, pagination, or detail routes, getStaticPaths() must derive every emitted path from local content collections only and may not assume host-side rewrites or runtime routing.',
  'Legacy top-level .html aliases and /pages/*.html detail URLs are unsupported and must not be emitted as compatibility pages; /404.html is the only allowed .html route in the public surface.',
];
