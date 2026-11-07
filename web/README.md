# PSRMA — landing page

Static [Astro](https://astro.build/) site presenting the tool. French at `/`, English at `/en/`.

```bash
cd web
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
```

- Copy and translations: `src/i18n/content.ts`
- Page markup: `src/components/Landing.astro`
- Design tokens (white / gray / black / blue, automatic dark mode): `src/styles/global.css`
- Screenshots: `public/screens/` (copied from `docs/images/`)
