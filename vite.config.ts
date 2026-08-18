import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split large, slow-changing third-party libs that are used across both eagerly-loaded
          // and lazy-loaded parts of the app into their own vendor chunks — separate from app
          // code (which changes every deploy), so a repeat visit after an app-only deploy can
          // reuse these from cache. Deliberately NOT a catch-all for every node_modules package:
          // anything left unmatched (jspdf, html2canvas, etc.) falls through to Rollup's normal
          // per-dynamic-import chunking, which is what keeps those out of the initial bundle for
          // routes that lazy-load them (see the React.lazy() calls in App.tsx).
          manualChunks(id) {
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'vendor-react';
            if (id.includes('/node_modules/motion/') || id.includes('/node_modules/framer-motion/')) return 'vendor-motion';
            if (id.includes('/node_modules/@supabase/')) return 'vendor-supabase';
            if (id.includes('/node_modules/lucide-react/')) return 'vendor-icons';
            // recharts is imported both eagerly (RitualsPage.tsx) and from lazy-loaded
            // components (DashboardConsistencyChart, WeeklyReportSummary/Page) — grouping it here
            // keeps it a single cached chunk shared by both, rather than duplicated per-entry.
            if (id.includes('/node_modules/recharts/') || /\/node_modules\/d3-[^/]+\//.test(id)) return 'vendor-recharts';
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
