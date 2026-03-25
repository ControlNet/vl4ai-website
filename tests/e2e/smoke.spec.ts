import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  footerUtilityLink,
  navContactCta,
  publicNavItems,
  publicRouteContract,
  unsupportedLegacyRoutePaths,
} from '../../src/data/route-contract';
import { routeSeo } from '../../src/lib/page-seo';

const previewOrigin = 'http://127.0.0.1:4321';
const astroConfigPath = fileURLToPath(new URL('../../astro.config.ts', import.meta.url));
const astroConfigSource = readFileSync(astroConfigPath, 'utf8');
const siteOrigin =
  astroConfigSource.match(/^\s*site:\s*'([^'\n]+)'\s*,?\s*$/mu)?.[1] ??
  (() => {
    throw new Error('Expected astro.config.ts to declare a site URL.');
  })();
const task7PublicationsScreenshotPath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-7-publications-desktop.png', import.meta.url),
);
const task3ShellNavScreenshotPath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-3-shell-nav.png', import.meta.url),
);
const task3ShellMobileNavScreenshotPath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-3-shell-mobile-nav.png', import.meta.url),
);
const task4HomepageDesktopScreenshotPath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-4-homepage-desktop.png', import.meta.url),
);
const task4HomepageCtaEvidencePath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-4-homepage-cta.txt', import.meta.url),
);
const task5PeopleNavEvidencePath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-5-people-nav.txt', import.meta.url),
);
const task7PublicationsCtaEvidencePath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-7-publications-cta.txt', import.meta.url),
);
const task8NewsScreenshotPath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-8-news-desktop.png', import.meta.url),
);
const task8NewsCtaEvidencePath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-8-news-cta.txt', import.meta.url),
);
const task9PositionsScreenshotPath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-9-positions-desktop.png', import.meta.url),
);
const task9PositionsNavEvidencePath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-9-positions-nav.txt', import.meta.url),
);
const task10ContactDesktopScreenshotPath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-10-contact-desktop.png', import.meta.url),
);
const task10ContactMaskedScreenshotPath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-10-contact-masked.png', import.meta.url),
);
const contactContentPath = fileURLToPath(new URL('../../src/content/site/contact.toml', import.meta.url));
const task11LegacyRetirementEvidencePath = fileURLToPath(
  new URL('../../.sisyphus/evidence/task-11-legacy-retirement.txt', import.meta.url),
);
const task11SitemapEvidencePath = fileURLToPath(new URL('../../.sisyphus/evidence/task-11-sitemap.txt', import.meta.url));
const parityRouteMatrixEvidencePath = fileURLToPath(new URL('../../.sisyphus/evidence/parity/route-matrix.txt', import.meta.url));
const publicationsRouteCopyPath = fileURLToPath(new URL('../../src/content/site/publications-route.md', import.meta.url));
const canonicalPublicPaths = publicRouteContract.map((route) => route.path);
const expectedCanonicalPublicPaths = [
  '/',
  '/people/',
  '/research/',
  '/publications/',
  '/news/',
  '/gallery/',
  '/positions/',
  '/contact/',
  '/404.html',
] as const;
const parityCriticalRoutes = [
  { id: 'home', path: '/', title: 'Homepage', screenshotKey: 'home' },
  { id: 'people', path: '/people/', title: 'People', screenshotKey: 'people' },
  { id: 'research', path: '/research/', title: 'Research', screenshotKey: 'research' },
  { id: 'publications', path: '/publications/', title: 'Publications', screenshotKey: 'publications' },
  { id: 'news', path: '/news/', title: 'News', screenshotKey: 'news' },
  { id: 'gallery', path: '/gallery/', title: 'Gallery', screenshotKey: 'gallery' },
  { id: 'positions', path: '/positions/', title: 'Positions', screenshotKey: 'positions' },
  { id: 'contact', path: '/contact/', title: 'Contact', screenshotKey: 'contact' },
] as const;

const publicationsRouteCopySource = readFileSync(publicationsRouteCopyPath, 'utf8');
const expectedPublicationsScholarHref =
  publicationsRouteCopySource.match(/^\s*url:\s*(https?:\/\/\S+)\s*$/mu)?.[1] ??
  (() => {
    throw new Error('Expected src/content/site/publications-route.md to declare a publications CTA url.');
  })();
const contactContentSource = readFileSync(contactContentPath, 'utf8');
const expectedContactMapHref =
  contactContentSource.match(/^mapUrl\s*=\s*"(https?:\/\/[^"\n]+)"\s*$/mu)?.[1] ??
  (() => {
    throw new Error('Expected src/content/site/contact.toml to declare a mapUrl.');
  })();
const escapedSiteOriginPattern = siteOrigin.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const absoluteSiteAssetPattern = new RegExp(`^${escapedSiteOriginPattern}/`, 'u');

test.describe.configure({ mode: 'serial' });

interface PageIssueMonitor {
  allIssues: () => string[];
}

const expectSeoMetadata = async (
  page: Page,
  expected: {
    title: string;
    description: string;
    canonical: string;
    robots?: string;
  },
) => {
  await expect(page).toHaveTitle(expected.title);
  await expect(page.locator('head meta[name="description"]')).toHaveAttribute('content', expected.description);
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', expected.robots ?? 'index,follow');
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', expected.canonical);
  await expect(page.locator('head meta[property="og:title"]')).toHaveAttribute('content', expected.title);
  await expect(page.locator('head meta[property="og:description"]')).toHaveAttribute('content', expected.description);
  await expect(page.locator('head meta[property="og:url"]')).toHaveAttribute('content', expected.canonical);
  await expect(page.locator('head meta[property="og:type"]')).toHaveAttribute('content', 'website');
  await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute('content', absoluteSiteAssetPattern);
  await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('head meta[name="twitter:title"]')).toHaveAttribute('content', expected.title);
  await expect(page.locator('head meta[name="twitter:description"]')).toHaveAttribute('content', expected.description);
  await expect(page.locator('head meta[name="twitter:image"]')).toHaveAttribute('content', absoluteSiteAssetPattern);
};

const toPreviewRelativeUrl = (value: string) => value.replace(previewOrigin, '');

const isPreviewResource = (value: string) => value.startsWith(previewOrigin);

const createPageIssueMonitor = (page: Page): PageIssueMonitor => {
  const consoleErrors = new Set<string>();
  const pageErrors = new Set<string>();
  const requestFailures = new Set<string>();
  const responseFailures = new Set<string>();

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.add(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.add(error.message);
  });

  page.on('requestfailed', (request) => {
    if (!isPreviewResource(request.url())) {
      return;
    }

    if (request.failure()?.errorText === 'net::ERR_ABORTED') {
      return;
    }

    requestFailures.add(
      `${request.failure()?.errorText ?? 'request failed'} :: ${request.method()} ${toPreviewRelativeUrl(request.url())}`,
    );
  });

  page.on('response', (response) => {
    if (!isPreviewResource(response.url()) || response.status() < 400) {
      return;
    }

    responseFailures.add(
      `${response.status()} :: ${response.request().method()} ${toPreviewRelativeUrl(response.url())}`,
    );
  });

  return {
    allIssues: () => [
      ...consoleErrors,
      ...pageErrors,
      ...requestFailures,
      ...responseFailures,
    ],
  };
};

const expectNoPageIssues = (monitor: PageIssueMonitor) => {
  expect(monitor.allIssues(), 'Preview smoke coverage should finish without console, page, or same-origin request failures.').toEqual([]);
};

const expectNonEmptyText = async (locator: Locator) => {
  await expect(locator).toHaveText(/\S/u);
};

const extractSitemapLocs = (xml: string) =>
  Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/gu), (match) => match[1]).filter((value): value is string => Boolean(value));

const ensureEvidenceDirectory = async (filePath: string) => {
  await mkdir(dirname(filePath), { recursive: true });
};

const writeEvidenceText = async (filePath: string, content: string) => {
  await ensureEvidenceDirectory(filePath);
  await writeFile(filePath, content, 'utf8');
};

const buildParityScreenshotPath = (viewportKey: 'desktop' | 'mobile', screenshotKey: (typeof parityCriticalRoutes)[number]['screenshotKey']) =>
  fileURLToPath(new URL(`../../.sisyphus/evidence/parity/${viewportKey}-${screenshotKey}.png`, import.meta.url));

const waitForStablePresentation = async (page: Page) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForFunction(() => (document as Document & { fonts?: FontFaceSet }).fonts?.status !== 'loading');
};

const writeParityScreenshot = async (
  page: Page,
  options: {
    viewportKey: 'desktop' | 'mobile';
    screenshotKey: (typeof parityCriticalRoutes)[number]['screenshotKey'];
    mask?: Locator[];
  },
) => {
  const screenshotPath = buildParityScreenshotPath(options.viewportKey, options.screenshotKey);
  await ensureEvidenceDirectory(screenshotPath);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
    mask: options.mask,
  });
};

const expectContractDrivenChrome = async (page: Page) => {
  const siteNav = page.getByTestId('site-nav');
  const siteFooter = page.getByTestId('site-footer');

  await expect(siteNav).toBeVisible();
  await expect(siteFooter).toBeVisible();

  for (const item of publicNavItems) {
    await expect(siteNav.getByTestId(item.testId)).toHaveAttribute('href', item.href);
    await expect(siteFooter.getByTestId(item.testId)).toHaveAttribute('href', item.href);
  }

  await expect(siteFooter.getByTestId(footerUtilityLink.testId)).toHaveAttribute('href', footerUtilityLink.href);

  const internalNavAndFooterLinks = await page.locator('[data-testid="site-nav"] a, [data-testid="site-footer"] a').evaluateAll(
    (elements) =>
      elements
        .map((element) => element.getAttribute('href'))
        .filter((value): value is string => Boolean(value))
        .filter((value) => value.startsWith('/')),
  );

  expect(internalNavAndFooterLinks.every((href) => !href.startsWith('/#'))).toBe(true);
  expect(internalNavAndFooterLinks.every((href) => !/\.html(?:$|[?#])/u.test(href))).toBe(true);
};

test('defines the canonical public route matrix and exposes it on the not-found route', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);

  expect(canonicalPublicPaths).toEqual(expectedCanonicalPublicPaths);
  expect(publicRouteContract.map((route) => route.id)).toEqual([
    'home',
    'people',
    'research',
    'publications',
    'news',
    'gallery',
    'positions',
    'contact',
    'not-found',
  ]);
  expect(publicNavItems.map((item) => item.href)).toEqual([
    '/people/',
    '/research/',
    '/publications/',
    '/news/',
    '/gallery/',
    '/positions/',
    '/contact/',
  ]);
  expect(navContactCta.href).toBe('/contact/');
  expect(footerUtilityLink.href).toBe('/contact/');

  await page.goto('/404.html', { waitUntil: 'domcontentloaded' });

  await expectSeoMetadata(page, {
    title: routeSeo.notFound.title,
    description: routeSeo.notFound.description,
    canonical: `${siteOrigin}/404.html`,
    robots: 'noindex,follow',
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('not-found-header')).toBeVisible();

  for (const route of publicRouteContract.filter((route) => route.path !== '/404.html')) {
    const routeCard = page.getByTestId(`not-found-route-${route.id}`);
    const routeAction = page.getByTestId(`not-found-action-${route.id}`);

    await expect(routeCard).toBeVisible();
    await expect(routeCard).toHaveAttribute('href', route.path);
    await expect(routeCard).toContainText(route.path);
    await expect(routeCard).toContainText(route.summary);
    await expect(routeAction).toHaveAttribute('href', route.path);
  }

  expectNoPageIssues(monitor);
});

test('serves the currently implemented canonical routes with stable metadata', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);

  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expectSeoMetadata(page, {
    title: routeSeo.home.title,
    description: routeSeo.home.description,
    canonical: `${siteOrigin}/`,
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('home-hero-section')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expectNonEmptyText(page.getByTestId('home-hero-eyebrow'));
  await expectNonEmptyText(page.locator('[data-testid="home-hero-section"] h1'));
  await expectNonEmptyText(page.locator('[data-testid="home-hero-section"] .home-hero__description'));
  await expect(page.getByTestId('home-hero-research-cta')).toHaveAttribute('href', '/research/');
  await expect(page.getByTestId('home-hero-publications-cta')).toHaveAttribute('href', '/publications/');
  await expectNonEmptyText(page.getByTestId('home-hero-research-cta'));
  await expectNonEmptyText(page.getByTestId('home-hero-publications-cta'));
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(2);

  await waitForStablePresentation(page);
  await ensureEvidenceDirectory(task3ShellNavScreenshotPath);
  await page.getByTestId('site-nav').screenshot({ path: task3ShellNavScreenshotPath });
  await ensureEvidenceDirectory(task4HomepageDesktopScreenshotPath);
  await page.screenshot({
    path: task4HomepageDesktopScreenshotPath,
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });

  const homeHeroEyebrow = await page.getByTestId('home-hero-eyebrow').innerText();
  const homeHeroTitle = await page.locator('[data-testid="home-hero-section"] h1').innerText();
  const researchHeroCta = page.getByTestId('home-hero-research-cta');
  const publicationsHeroCta = page.getByTestId('home-hero-publications-cta');
  const researchHeroLabel = await researchHeroCta.innerText();
  const researchHeroHref = await researchHeroCta.getAttribute('href');
  const publicationsHeroLabel = await publicationsHeroCta.innerText();
  const publicationsHeroHref = await publicationsHeroCta.getAttribute('href');

  await Promise.all([page.waitForURL('**/research/'), researchHeroCta.click()]);
  await expect(page).toHaveURL('/research/');
  const researchHeroDestination = new URL(page.url());
  expect(researchHeroDestination.hash).toBe('');

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await Promise.all([page.waitForURL('**/publications/'), page.getByTestId('home-hero-publications-cta').click()]);
  await expect(page).toHaveURL('/publications/');
  const publicationsHeroDestination = new URL(page.url());
  expect(publicationsHeroDestination.hash).toBe('');

  await writeEvidenceText(
    task4HomepageCtaEvidencePath,
    [
      `home-hero-eyebrow: ${homeHeroEyebrow}`,
      `home-hero-title: ${homeHeroTitle}`,
      `home-hero-research-cta label: ${researchHeroLabel}`,
      `home-hero-research-cta href: ${researchHeroHref}`,
      `home-hero-research-cta final pathname: ${researchHeroDestination.pathname}`,
      `home-hero-research-cta final hash: ${researchHeroDestination.hash || '(none)'}`,
      `home-hero-publications-cta label: ${publicationsHeroLabel}`,
      `home-hero-publications-cta href: ${publicationsHeroHref}`,
      `home-hero-publications-cta final pathname: ${publicationsHeroDestination.pathname}`,
      `home-hero-publications-cta final hash: ${publicationsHeroDestination.hash || '(none)'}`,
    ].join('\n'),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForStablePresentation(page);
  const mobileMenuButton = page.getByTestId('site-nav-menu-button');
  const mobileResearchNavLink = page.getByTestId('site-nav').getByTestId('site-nav-link-research');

  await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
  await mobileMenuButton.click();
  await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('site-nav')).toHaveAttribute('data-mobile-menu-open', 'true');
  await Promise.all([page.waitForURL('**/research/'), mobileResearchNavLink.click()]);
  await expect(page).toHaveURL('/research/');
  await expect(page.getByTestId('site-nav')).toHaveAttribute('data-mobile-menu-open', 'false');
  await expect(page.getByTestId('site-nav-menu-button')).toHaveAttribute('aria-expanded', 'false');
  await ensureEvidenceDirectory(task3ShellMobileNavScreenshotPath);
  await page.getByTestId('site-nav').screenshot({ path: task3ShellMobileNavScreenshotPath });

  await page.setViewportSize({ width: 1440, height: 1080 });

  await page.goto('/news/', { waitUntil: 'domcontentloaded' });

  await expectSeoMetadata(page, {
    title: routeSeo.newsArchive.title,
    description: routeSeo.newsArchive.description,
    canonical: `${siteOrigin}/news/`,
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('news-archive-header')).toBeVisible();
  await expect(page.locator('[data-news-year]').first()).toBeVisible();
  await expect(page.getByTestId('news-archive-item').first()).toBeVisible();
  await expect(page.getByTestId('site-nav').getByTestId('site-nav-link-news')).toHaveClass(/is-active/);

  await page.goto('/publications/', { waitUntil: 'domcontentloaded' });

  await expectSeoMetadata(page, {
    title: routeSeo.publicationsArchive.title,
    description: routeSeo.publicationsArchive.description,
    canonical: `${siteOrigin}/publications/`,
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('publications-archive-header')).toBeVisible();
  await expect(page.getByTestId('publication-year-group').first()).toBeVisible();
  await expect(page.getByTestId('publication-archive-item').first()).toBeVisible();
  await expect(page.getByTestId('site-nav').getByTestId('site-nav-link-publications')).toHaveClass(/is-active/);

  await page.goto('/404.html', { waitUntil: 'domcontentloaded' });

  await expectSeoMetadata(page, {
    title: routeSeo.notFound.title,
    description: routeSeo.notFound.description,
    canonical: `${siteOrigin}/404.html`,
    robots: 'noindex,follow',
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('not-found-header')).toBeVisible();

  expectNoPageIssues(monitor);
});

test('unsupported legacy html routes stay retired and render the canonical 404 surface', async ({ page }) => {
  const evidenceLines: string[] = [];

  for (const legacyPath of unsupportedLegacyRoutePaths) {
    const response = await page.goto(legacyPath, { waitUntil: 'domcontentloaded' });

    expect(response, `${legacyPath} should produce a preview response.`).not.toBeNull();
    expect(response?.status(), `${legacyPath} should remain unsupported.`).toBe(404);
    expect(new URL(page.url()).pathname, `${legacyPath} should not redirect to a live canonical page.`).toBe(legacyPath);

    await expect(page).toHaveTitle(routeSeo.notFound.title);
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `${siteOrigin}/404.html`);
    await expect(page.getByTestId('not-found-header')).toBeVisible();
    await expect(page.getByTestId('not-found-action-people')).toHaveAttribute('href', '/people/');
    await expect(page.getByTestId('not-found-action-research')).toHaveAttribute('href', '/research/');
    await expect(page.getByTestId('not-found-action-publications')).toHaveAttribute('href', '/publications/');
    await expect(page.getByTestId('not-found-action-news')).toHaveAttribute('href', '/news/');
    await expect(page.getByTestId('not-found-action-gallery')).toHaveAttribute('href', '/gallery/');
    await expect(page.getByTestId('not-found-action-positions')).toHaveAttribute('href', '/positions/');
    await expect(page.getByTestId('not-found-action-contact')).toHaveAttribute('href', '/contact/');

    evidenceLines.push(`${legacyPath} -> status ${response?.status()} | final pathname ${new URL(page.url()).pathname}`);
  }

  await writeEvidenceText(task11LegacyRetirementEvidencePath, evidenceLines.join('\n'));
});

test('navigates from the homepage to the standalone people route and preserves section order', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);
  const peopleNavLink = page.getByTestId('site-nav').getByTestId('site-nav-link-people');

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(peopleNavLink).toHaveAttribute('href', '/people/');
  const peopleNavHref = await peopleNavLink.getAttribute('href');

  await peopleNavLink.click();

  await expect(page).toHaveURL('/people/');
  await expectSeoMetadata(page, {
    title: routeSeo.people.title,
    description: routeSeo.people.description,
    canonical: `${siteOrigin}/people/`,
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('site-nav').getByTestId('site-nav-link-people')).toHaveClass(/is-active/);
  await expect(page.getByTestId('people-page-header')).toContainText('Our Team');
  await expect(page.getByTestId('people-director-feature')).toContainText('Hamid');
  await expect(page.getByTestId('people-postdoc-card').first()).toBeVisible();
  await expect(page.getByTestId('people-phd-card').first()).toBeVisible();
  await expect(page.getByTestId('people-masters-card').first()).toBeVisible();
  await expect(page.getByTestId('people-alumni-groups')).toBeVisible();

  const sectionOrder = await page.locator('[data-people-section]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-people-section')),
  );

  expect(sectionOrder).toEqual(['director', 'postdocs', 'phd', 'masters', 'alumni']);

  const navLinkTargets = await page.getByTestId('site-nav').locator('a[href^="/"]').evaluateAll((elements) =>
    elements.map((element) => {
      const href = element.getAttribute('href') ?? '';
      const label = element.textContent?.replace(/\s+/gu, ' ').trim() ?? '';
      const current = element.getAttribute('aria-current') ?? '';

      return `${label} -> ${href}${current ? ` | aria-current=${current}` : ''}`;
    }),
  );

  await writeEvidenceText(
    task5PeopleNavEvidencePath,
    [
      `site-nav-link-people href: ${peopleNavHref}`,
      `final pathname: ${new URL(page.url()).pathname}`,
      'site nav links:',
      ...navLinkTargets,
      `people sections: ${sectionOrder.join(' -> ')}`,
    ].join('\n'),
  );

  expectNoPageIssues(monitor);
});

test('Research route renders from local content and the research CTA resolves to /research/ without hash navigation', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('research-page-header')).toHaveCount(0);
  await expect(page.getByTestId('research-pillars-section')).toHaveCount(0);
  await page.getByTestId('home-hero-research-cta').click();

  await expect(page).toHaveURL('/research/');
  await expectSeoMetadata(page, {
    title: routeSeo.research.title,
    description: routeSeo.research.description,
    canonical: `${siteOrigin}/research/`,
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('site-nav').getByTestId('site-nav-link-research')).toHaveClass(/is-active/);
  await expect(page.getByTestId('research-page-header')).toBeVisible();
  await expectNonEmptyText(page.getByTestId('research-page-header').locator('h1'));
  await expectNonEmptyText(page.getByTestId('research-page-header').locator('p').last());
  await expect(page.locator('[data-research-pillar]')).toHaveCount(3);
  await expect(page.getByTestId('research-featured-topic-perception')).toBeVisible();
  await expect(page.getByTestId('research-featured-topic-forecasting')).toBeVisible();
  await expect(page.getByTestId('research-featured-topic-navigation')).toBeVisible();

  const pillarOrder = await page.locator('[data-research-pillar]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-research-pillar')),
  );

  expect(pillarOrder).toEqual(['perception', 'forecasting', 'navigation']);

  await expect(page.getByTestId('research-impact-section')).toBeVisible();
  await expectNonEmptyText(page.getByTestId('research-benchmark-spotlight').locator('h3'));
  await expect(page.getByTestId('research-benchmark-spotlight-link')).toHaveAttribute(
    'href',
    /^https?:\/\//,
  );
  expect(
    await page.locator('[data-testid^="research-benchmark-link-"], [data-testid^="research-benchmark-chip-"]').count(),
  ).toBeGreaterThan(0);

  expectNoPageIssues(monitor);
});

test('publications route renders descending year dividers, scholar CTA, and compact row actions', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);

  await page.goto('/publications/', { waitUntil: 'domcontentloaded' });

  await expectSeoMetadata(page, {
    title: routeSeo.publicationsArchive.title,
    description: routeSeo.publicationsArchive.description,
    canonical: `${siteOrigin}/publications/`,
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('site-nav').getByTestId('site-nav-link-publications')).toHaveClass(/is-active/);
  await expect(page.getByTestId('publications-archive-header')).toBeVisible();
  await expect(page.getByTestId('publications-scholar-cta')).toHaveAttribute(
    'href',
    expectedPublicationsScholarHref,
  );

  const sortValues = await page.locator('[data-publication-year-sort]').evaluateAll((elements) =>
    elements.map((element) => Number(element.getAttribute('data-publication-year-sort'))),
  );

  expect(sortValues).toEqual([...sortValues].sort((left, right) => right - left));

  const firstPublicationRow = page.getByTestId('publication-archive-item').first();
  await expect(firstPublicationRow).toBeVisible();
  await expect(firstPublicationRow.getByTestId('publication-row-actions')).toBeVisible();
  await expect(firstPublicationRow.getByRole('link').first()).toHaveAttribute('href', /^https?:\/\//);

  await ensureEvidenceDirectory(task7PublicationsScreenshotPath);
  await page.screenshot({ path: task7PublicationsScreenshotPath, fullPage: true });

  expectNoPageIssues(monitor);
});

test('homepage publications CTAs resolve to /publications/ without hash anchors', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const heroPublicationsCta = page.getByTestId('home-hero-publications-cta');
  const archivePublicationsCta = page.getByTestId('home-publications-archive-cta');

  await expect(heroPublicationsCta).toHaveAttribute('href', '/publications/');
  await expect(archivePublicationsCta).toHaveAttribute('href', '/publications/');

  const heroPublicationsHref = await heroPublicationsCta.getAttribute('href');
  const archivePublicationsHref = await archivePublicationsCta.getAttribute('href');

  await heroPublicationsCta.click();
  await expect(page).toHaveURL('/publications/');
  await expect(page.getByTestId('publications-archive-header')).toBeVisible();

  const currentUrl = new URL(page.url());

  await writeEvidenceText(
    task7PublicationsCtaEvidencePath,
    [
      `home-hero-publications-cta href: ${heroPublicationsHref}`,
      `home-publications-archive-cta href: ${archivePublicationsHref}`,
      `final pathname: ${currentUrl.pathname}`,
      `final hash: ${currentUrl.hash || '(none)'}`,
    ].join('\n'),
  );

  expect(currentUrl.hash).toBe('');
  expectNoPageIssues(monitor);
});

test('news archive route renders a descending timeline with thumbnails and captures News archive evidence', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);

  await page.goto('/news/', { waitUntil: 'domcontentloaded' });

  await expectSeoMetadata(page, {
    title: routeSeo.newsArchive.title,
    description: routeSeo.newsArchive.description,
    canonical: `${siteOrigin}/news/`,
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('site-nav').getByTestId('site-nav-link-news')).toHaveClass(/is-active/);
  await expect(page.getByTestId('news-archive-header')).toBeVisible();
  await expectNonEmptyText(page.getByTestId('news-archive-header').locator('h1'));
  await expectNonEmptyText(page.getByTestId('news-archive-header').locator('p').last());
  await expect(page.getByTestId('news-year-group').first()).toBeVisible();
  await expect(page.getByTestId('news-archive-item').first()).toBeVisible();
  const archiveImageCount = await page.getByTestId('news-archive-section').locator('img').count();
  const archiveItemCount = await page.getByTestId('news-archive-item').count();
  expect(archiveImageCount).toBe(archiveItemCount);
  expect(archiveImageCount).toBeGreaterThan(0);

  const yearSortValues = await page.locator('[data-news-year-sort]').evaluateAll((elements) =>
    elements.map((element) => Number(element.getAttribute('data-news-year-sort'))),
  );

  expect(yearSortValues).toEqual([...yearSortValues].sort((left, right) => right - left));

  const publishedDates = await page.locator('[data-news-published-at]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-news-published-at') ?? ''),
  );

  expect(publishedDates).toEqual([...publishedDates].sort((left, right) => right.localeCompare(left)));

  const firstNewsItem = page.getByTestId('news-archive-item').first();
  await expectNonEmptyText(firstNewsItem.locator('time'));
  await expectNonEmptyText(firstNewsItem.locator('h3'));
  await expectNonEmptyText(firstNewsItem.locator('p'));
  await expect(firstNewsItem.locator('a')).toHaveAttribute('href', /\S/u);

  await ensureEvidenceDirectory(task8NewsScreenshotPath);
  await page.screenshot({ path: task8NewsScreenshotPath, fullPage: true });

  expectNoPageIssues(monitor);
});

test('homepage news CTA resolves to /news/ without hash anchors and writes news CTA evidence', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const archiveNewsCta = page.getByTestId('home-news-archive-cta');

  await expect(archiveNewsCta).toHaveAttribute('href', '/news/');

  const archiveNewsHref = await archiveNewsCta.getAttribute('href');

  await archiveNewsCta.click();
  await expect(page).toHaveURL('/news/');
  await expect(page.getByTestId('news-archive-header')).toBeVisible();
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `${siteOrigin}/news/`);

  const currentUrl = new URL(page.url());
  const canonicalHref = await page.locator('head link[rel="canonical"]').getAttribute('href');

  await writeEvidenceText(
    task8NewsCtaEvidencePath,
    [
      `home-news-archive-cta href: ${archiveNewsHref}`,
      `final pathname: ${currentUrl.pathname}`,
      `final hash: ${currentUrl.hash || '(none)'}`,
      `canonical href: ${canonicalHref ?? '(missing)'}`,
    ].join('\n'),
  );

  expect(currentUrl.hash).toBe('');
  expectNoPageIssues(monitor);
});

test('positions route renders collection-backed recruitment sections and captures positions desktop evidence', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);

  await page.goto('/positions/', { waitUntil: 'domcontentloaded' });

  await expectSeoMetadata(page, {
    title: routeSeo.positions.title,
    description: routeSeo.positions.description,
    canonical: `${siteOrigin}/positions/`,
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('site-nav').getByTestId('site-nav-link-positions')).toHaveClass(/is-active/);
  await expect(page.getByTestId('positions-page-header')).toBeVisible();
  await expectNonEmptyText(page.getByTestId('positions-page-header').locator('h1'));
  await expectNonEmptyText(page.getByTestId('positions-page-header').locator('p').last());
  await expect(page.getByTestId('positions-phd-section')).toBeVisible();
  await expect(page.getByTestId('positions-opportunities-block')).toBeVisible();
  await expect(page.getByTestId('positions-separator')).toBeVisible();
  await expect(page.getByTestId('positions-staff-section')).toBeVisible();
  await expectNonEmptyText(page.getByTestId('positions-inclusion-statement'));
  expect(await page.getByTestId('positions-important-link').count()).toBeGreaterThan(0);

  const phdCards = page.locator('[data-testid="positions-opening-card"][data-position-type="phd"]');
  const staffCards = page.locator('[data-testid="positions-opening-card"]:not([data-position-type="phd"])');

  await expect(phdCards.first()).toBeVisible();
  await expectNonEmptyText(phdCards.first().locator('h4'));
  await expectNonEmptyText(phdCards.first().locator('p').first());
  await expect(phdCards.first()).toHaveAttribute('data-position-status', 'open');
  await expect(staffCards.first()).toBeVisible();
  await expectNonEmptyText(staffCards.first().locator('h4'));

  const phdStatuses = await phdCards.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-position-status') ?? ''),
  );

  expect(phdStatuses[0]).toBe('open');
  expect(phdStatuses.every((status) => ['open', 'closed', 'archived'].includes(status))).toBe(true);

  await ensureEvidenceDirectory(task9PositionsScreenshotPath);
  await page.screenshot({ path: task9PositionsScreenshotPath, fullPage: true });

  expectNoPageIssues(monitor);
});

test('homepage positions navigation resolves to /positions/ without hash anchors and writes positions navigation evidence', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const positionsNavLink = page.getByTestId('site-nav').getByTestId('site-nav-link-positions');

  await expect(positionsNavLink).toHaveAttribute('href', '/positions/');

  const positionsNavHref = await positionsNavLink.getAttribute('href');

  await positionsNavLink.click();
  await expect(page).toHaveURL('/positions/');
  await expect(page.getByTestId('positions-page-header')).toBeVisible();
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `${siteOrigin}/positions/`);

  const currentUrl = new URL(page.url());
  const canonicalHref = await page.locator('head link[rel="canonical"]').getAttribute('href');

  await writeEvidenceText(
    task9PositionsNavEvidencePath,
    [
      `site-nav-link-positions href: ${positionsNavHref}`,
      `final pathname: ${currentUrl.pathname}`,
      `final hash: ${currentUrl.hash || '(none)'}`,
      `canonical href: ${canonicalHref ?? '(missing)'}`,
    ].join('\n'),
  );

  expect(currentUrl.hash).toBe('');
  expectNoPageIssues(monitor);
});

test('contact route renders collection-backed location blocks, canonical chrome, and masked evidence', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);

  await page.goto('/contact/', { waitUntil: 'domcontentloaded' });

  await expectSeoMetadata(page, {
    title: routeSeo.contact.title,
    description: routeSeo.contact.description,
    canonical: `${siteOrigin}/contact/`,
  });

  await expectContractDrivenChrome(page);
  await expect(page.getByTestId('site-nav').getByTestId('site-nav-link-contact')).toHaveClass(/is-active/);
  await expect(page.getByTestId('contact-page-header')).toBeVisible();
  await expectNonEmptyText(page.getByTestId('contact-page-header').locator('h1'));
  await expectNonEmptyText(page.getByTestId('contact-page-header').locator('p').last());

  const locationBlock = page.getByTestId('contact-location-block');
  await expect(locationBlock).toBeVisible();
  await expectNonEmptyText(locationBlock.locator('h2'));
  await expectNonEmptyText(locationBlock.locator('.contact-page__location-label'));
  expect(await locationBlock.locator('address p').count()).toBeGreaterThan(0);

  const detailsBlock = page.getByTestId('contact-details-block');
  await expect(detailsBlock).toBeVisible();
  await expect(detailsBlock.locator('a[href^="tel:"]')).toHaveCount(0);
  await expect(detailsBlock.locator('a[href^="mailto:"]')).toHaveCount(1);
  await expectNonEmptyText(detailsBlock.locator('a[href^="mailto:"]'));

  const mapBlock = page.getByTestId('contact-map-block');
  await expect(mapBlock).toBeVisible();
  await expect(mapBlock.getByTestId('contact-map-embed')).toHaveAttribute('src', /google\.com\/maps(?:\/embed|\?)/u);
  await expect(mapBlock.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute(
    'href',
    expectedContactMapHref,
  );

  await ensureEvidenceDirectory(task10ContactDesktopScreenshotPath);
  await page.getByTestId('contact-page-header').screenshot({ path: task10ContactDesktopScreenshotPath });
  await page.screenshot({
    path: task10ContactMaskedScreenshotPath,
    fullPage: true,
    mask: [mapBlock],
  });

  expectNoPageIssues(monitor);
});

test('sitemap enumerates only canonical slash routes and keeps chrome free of hash-route and legacy-html link targets', async ({ page, request }) => {
  const monitor = createPageIssueMonitor(page);

  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.ok()).toBeTruthy();
  const robotsText = await robotsResponse.text();
  expect(robotsText).toContain('User-agent: *');
  expect(robotsText).toContain(`Sitemap: ${siteOrigin}/sitemap-index.xml`);

  const sitemapIndexResponse = await request.get('/sitemap-index.xml');
  expect(sitemapIndexResponse.ok()).toBeTruthy();
  const sitemapIndexText = await sitemapIndexResponse.text();
  expect(sitemapIndexText).toContain(`${siteOrigin}/sitemap-0.xml`);

  const sitemapEntriesResponse = await request.get('/sitemap-0.xml');
  expect(sitemapEntriesResponse.ok()).toBeTruthy();
  const sitemapEntriesText = await sitemapEntriesResponse.text();
  const sitemapLocs = extractSitemapLocs(sitemapEntriesText);
  const sitemapPaths = sitemapLocs.map((value) => new URL(value).pathname).sort();
  const expectedSitemapPaths = canonicalPublicPaths.filter((path) => path !== '/404.html').sort();

  expect(sitemapPaths).toEqual(expectedSitemapPaths);
  expect(sitemapPaths.every((path) => !/\.html$/u.test(path))).toBe(true);

  for (const legacyPath of unsupportedLegacyRoutePaths) {
    expect(sitemapEntriesText).not.toContain(legacyPath);
  }

  await writeEvidenceText(
    task11SitemapEvidencePath,
    [
      `robots sitemap line present: ${robotsText.includes(`Sitemap: ${siteOrigin}/sitemap-index.xml`)}`,
      `sitemap index loc: ${siteOrigin}/sitemap-0.xml`,
      'sitemap paths:',
      ...sitemapPaths,
    ].join('\n'),
  );

  await page.goto('/news/', { waitUntil: 'domcontentloaded' });
  await expectContractDrivenChrome(page);

  await page.goto('/publications/', { waitUntil: 'domcontentloaded' });
  await expectContractDrivenChrome(page);

  await page.goto('/404.html', { waitUntil: 'domcontentloaded' });
  await expectContractDrivenChrome(page);

  expectNoPageIssues(monitor);
});

test('writes deterministic parity evidence for canonical routes on desktop and mobile', async ({ page }) => {
  const monitor = createPageIssueMonitor(page);
  const routeMatrixLines: string[] = ['canonical route matrix'];

  await page.setViewportSize({ width: 1440, height: 1080 });

  for (const route of parityCriticalRoutes) {
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    expect(response, `${route.path} should produce a preview response.`).not.toBeNull();
    await expect(page).toHaveURL(route.path);
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `${siteOrigin}${route.path}`);
    await expectContractDrivenChrome(page);
    await waitForStablePresentation(page);

    const desktopMask = route.id === 'contact' ? [page.getByTestId('contact-map-block')] : undefined;
    await writeParityScreenshot(page, {
      viewportKey: 'desktop',
      screenshotKey: route.screenshotKey,
      mask: desktopMask,
    });

    routeMatrixLines.push(
      `${route.path} | ${route.title} | status ${response?.status() ?? 'unknown'} | final pathname ${new URL(page.url()).pathname} | canonical ${siteOrigin}${route.path}`,
    );
  }

  routeMatrixLines.push('', 'not-found route');

  const notFoundResponse = await page.goto('/404.html', { waitUntil: 'domcontentloaded' });
  expect(notFoundResponse, '/404.html should produce a preview response.').not.toBeNull();
  await expect(page).toHaveURL('/404.html');
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `${siteOrigin}/404.html`);
  await waitForStablePresentation(page);
  routeMatrixLines.push(
    `/404.html | Not found | status ${notFoundResponse?.status() ?? 'unknown'} | final pathname ${new URL(page.url()).pathname} | canonical ${siteOrigin}/404.html`,
  );

  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of parityCriticalRoutes) {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(route.path);
    await waitForStablePresentation(page);

    const mobileMask = route.id === 'contact' ? [page.getByTestId('contact-map-block')] : undefined;
    await writeParityScreenshot(page, {
      viewportKey: 'mobile',
      screenshotKey: route.screenshotKey,
      mask: mobileMask,
    });
  }

  routeMatrixLines.push('', 'retired legacy paths');

  for (const legacyPath of unsupportedLegacyRoutePaths) {
    routeMatrixLines.push(`${legacyPath} | retired`);
  }

  await writeEvidenceText(parityRouteMatrixEvidencePath, routeMatrixLines.join('\n'));
  expectNoPageIssues(monitor);
});
