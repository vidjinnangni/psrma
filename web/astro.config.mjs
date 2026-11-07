import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://psrma.vidjinnangni.net',
  output: 'static',
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
