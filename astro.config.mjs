import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://thewaxpapers.co',
  output: 'static',
  trailingSlash: 'always',
  build: {
    assets: 'assets',
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  image: {
    remotePatterns: [],
  },
});
