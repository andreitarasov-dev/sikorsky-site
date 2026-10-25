import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { themeIntegration } from '@sikorsky/site';
import themeConfig from './theme.config';
export default defineConfig({
  integrations: [themeIntegration({ config: themeConfig })],
  vite: {
    ssr: { noExternal: ['firebase'] },
    resolve: { alias: process.env.THEME_MOCK_LIKES === '1' ? { 'firebase/database': fileURLToPath(new URL('./firebase-mock.ts', import.meta.url)) } : {} },
  },
});
