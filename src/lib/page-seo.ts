const defaultSocialImage = '/images/slider/JRMOT.png';
const logoSocialImage = '/images/logo.png';

export interface RouteSeoDefinition {
  title: string;
  description: string;
  socialImage?: string;
  socialImageAlt?: string;
}

export const routeSeo = {
  home: {
    title: 'Vision & Language for Autonomous AI (VL4AI) Research',
    description:
      'Explore VL4AI, including people, research, selected publications, latest news, positions, and contact details for the VL4AI.',
    socialImage: defaultSocialImage,
    socialImageAlt: 'VL4AI research showcase artwork',
  },
  people: {
    title: 'People | Vision & Language for Autonomous AI (VL4AI) Research',
    description:
      'Meet the VL4AI Research team, collaborators, and alumni.',
    socialImage: defaultSocialImage,
    socialImageAlt: 'VL4AI people route artwork',
  },
  research: {
    title: 'Research | Vision & Language for Autonomous AI (VL4AI) Research',
    description:
      'Explore the VL4AI Research areas spanning perception, forecasting, navigation, and embodied AI systems.',
    socialImage: defaultSocialImage,
    socialImageAlt: 'VL4AI research route artwork',
  },
  newsArchive: {
    title: 'News | Vision & Language for Autonomous AI (VL4AI) Research',
    description:
      'Browse the VL4AI Research news for updates, paper acceptances, grants, benchmarks, and community milestones.',
    socialImage: '/images/news/zhixi_neusis.png',
    socialImageAlt: 'VL4AI news archive artwork',
  },
  gallery: {
    title: 'Gallery | Vision & Language for Autonomous AI (VL4AI) Research',
    description: 'Visual highlights from VL4AI Research.',
    socialImage: defaultSocialImage,
    socialImageAlt: 'VL4AI gallery route artwork',
  },
  publicationsArchive: {
    title: 'Publications | Vision & Language for Autonomous AI (VL4AI) Research',
    description:
      'Browse the VL4AI Research publications spanning conference papers, journal articles, and benchmark releases.',
    socialImage: '/images/pub/TrackerBot.png',
    socialImageAlt: 'VL4AI publications archive artwork',
  },
  positions: {
    title: 'Positions | Vision & Language for Autonomous AI (VL4AI) Research',
    description:
      'View current VL4AI Research recruitment information, openings, and hiring pathways for students and research staff.',
    socialImage: defaultSocialImage,
    socialImageAlt: 'VL4AI positions route artwork',
  },
  contact: {
    title: 'Contact | Vision & Language for Autonomous AI (VL4AI) Research',
    description:
      'Find the VL4AI Research address, contact details, and directions.',
    socialImage: logoSocialImage,
    socialImageAlt: 'VL4AI contact route artwork',
  },
  notFound: {
    title: 'Route Not Found | Vision & Language for Autonomous AI (VL4AI) Research',
    description:
      'The requested route is unavailable or retired. Use the homepage, People, Research, Publications, News, Gallery, Positions, or Contact pages to continue on the supported public site.',
    socialImage: logoSocialImage,
    socialImageAlt: 'VL4AI logo',
  },
} as const satisfies Record<string, RouteSeoDefinition>;
