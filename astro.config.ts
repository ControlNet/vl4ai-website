import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const sitemapExcludedPaths = new Set(['/404.html']);

export default defineConfig({
  output: 'static',
  site: 'https://vl4ai.github.io',
  base: '/',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      filter: (page) => !sitemapExcludedPaths.has(new URL(page).pathname),
    }),
  ],
});
