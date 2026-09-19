import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  // ==========================================
  // MAIN PROCESS
  // ==========================================
  main: {
    build: {
      rollupOptions: {
        external: [
          'better-sqlite3',
          'drizzle-orm',
          'drizzle-orm/better-sqlite3',
          'electron',
          'path',
          'fs',
          'url',
          'node:path',
          'node:fs',
          'node:url',
        ],

        input: {
          index: resolve(__dirname, 'src/main/main.js'),
        },

        output: {
          format: 'es',
          preserveModules: true,
          entryFileNames: 'index.js',
        },
      },
    },

    ssr: {
      noExternal: [],
    },

    optimizeDeps: {
      exclude: [
        'better-sqlite3',
        'drizzle-orm',
      ],
    },
  },

  // ==========================================
  // PRELOAD
  // ==========================================
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.mjs'),
        },

        output: {
          format: 'es',
          entryFileNames: '[name].mjs',
        },
      },
    },
  },

  // ==========================================
  // RENDERER
  // ==========================================
  renderer: {
    root: 'src/renderer',

    // ⭐ IMPORTANT FOR ELECTRON + loadFile()
    base: './',

    plugins: [
      react(),
    ],

    build: {
      outDir: 'out/renderer',

      rollupOptions: {
        input: {
          index: resolve(
            __dirname,
            'src/renderer/index.html'
          ),
        },
      },
    },

    server: {
      port: 5173,
    },
  },
});