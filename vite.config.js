import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function handoverPwaPlugin() {
  return {
    name: 'handover-pwa-stamp',
    writeBundle(options) {
      const outDir = options.dir || path.resolve(process.cwd(), 'dist');
      const swPath = path.join(outDir, 'sw.js');
      const version = `v${Date.now()}`;

      if (fs.existsSync(swPath)) {
        const swContent = fs
          .readFileSync(swPath, 'utf8')
          .replace(/__SW_CACHE_VERSION__/g, version);
        fs.writeFileSync(swPath, swContent, 'utf8');
      }

      // Include SPA rewrites and no-cache headers inside prebuilt dist output
      const distVercelConfig = {
        rewrites: [{ source: '/(.*)', destination: '/index.html' }],
        headers: [
          {
            source: '/sw.js',
            headers: [
              {
                key: 'Cache-Control',
                value: 'no-cache, no-store, must-revalidate',
              },
            ],
          },
          {
            source: '/index.html',
            headers: [
              {
                key: 'Cache-Control',
                value: 'no-cache, no-store, must-revalidate',
              },
            ],
          },
          {
            source: '/manifest.webmanifest',
            headers: [
              { key: 'Content-Type', value: 'application/manifest+json' },
            ],
          },
        ],
      };
      fs.writeFileSync(
        path.join(outDir, 'vercel.json'),
        JSON.stringify(distVercelConfig, null, 2),
        'utf8'
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), handoverPwaPlugin()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
});
