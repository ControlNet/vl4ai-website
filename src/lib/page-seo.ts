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
    title: 'Vision & Language for Autonomous AI | VL4AI at Monash University',
    description:
      'Explore VL4AI at Monash University, including people, research, selected publications, latest news, positions, and contact details for the Vision & Language for Autonomous AI lab.',
    socialImage: defaultSocialImage,
    socialImageAlt: 'VL4AI research showcase artwork',
  },
  people: {
    title: 'People | VL4AI at Monash University',
    description:
      'Meet the VL4AI team at Monash University, including current lab members, collaborators, and alumni.',
    socialImage: defaultSocialImage,
    socialImageAlt: 'VL4AI people route artwork',
  },
  research: {
    title: 'Research | VL4AI at Monash University',
    description:
      'Explore the VL4AI research areas spanning perception, forecasting, navigation, and embodied AI systems.',
    socialImage: defaultSocialImage,
    socialImageAlt: 'VL4AI research route artwork',
  },
  newsArchive: {
    title: 'News Archive | VL4AI at Monash University',
    description:
      'Browse the VL4AI news archive for lab updates, paper acceptances, grants, benchmarks, and community milestones from the Vision & Language for Autonomous AI lab.',
    socialImage: '/images/news/zhixi_neusis.png',
    socialImageAlt: 'VL4AI news archive artwork',
  },
  publicationsArchive: {
    title: 'Publications Archive | VL4AI at Monash University',
    description:
      'Browse the VL4AI publications archive spanning conference papers, journal articles, and benchmark releases from the Vision & Language for Autonomous AI lab at Monash University.',
    socialImage: '/images/pub/TrackerBot.png',
    socialImageAlt: 'VL4AI publications archive artwork',
  },
  positions: {
    title: 'Positions | VL4AI at Monash University',
    description:
      'View current VL4AI recruitment information, openings, and hiring pathways for students and research staff.',
    socialImage: defaultSocialImage,
    socialImageAlt: 'VL4AI positions route artwork',
  },
  contact: {
    title: 'Contact | VL4AI at Monash University',
    description:
      'Find the VL4AI lab address, contact details, and contact pathway for the Vision & Language for Autonomous AI lab.',
    socialImage: logoSocialImage,
    socialImageAlt: 'VL4AI contact route artwork',
  },
  notFound: {
    title: 'Route Not Found | VL4AI at Monash University',
    description:
      'The requested VL4AI route is unavailable or retired. Use the homepage, People, Research, Publications, News, Positions, or Contact pages to continue on the supported public site.',
    socialImage: logoSocialImage,
    socialImageAlt: 'VL4AI logo',
  },
} as const satisfies Record<string, RouteSeoDefinition>;
