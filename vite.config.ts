import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(), 
    tailwindcss(),
    // Bundle analyzer - only in analyze mode
    process.env.ANALYZE ? visualizer({ open: true }) : undefined
  ].filter(Boolean),

  // Build optimizations
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        // Code splitting strategy
        manualChunks: {
          // Vendor chunk - rarely changes
          'vendor': [
            'react', 
            'react-dom', 
            'react-router-dom',
            'zustand',
            '@supabase/supabase-js'
          ],
          // UI Components chunk
          'ui': [
            'framer-motion',
            'lucide-react'
          ],
          // Video player chunk
          'player': ['hls.js'],
        },
        // Optimize chunk file naming
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) return 'assets/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 500,
    // Source maps only in development
    sourcemap: process.env.NODE_ENV !== 'production',
  },

  // Development server optimizations
  server: {
    port: 7180,
    strictPort: false,
    host: host || true,
    hmr: {
      overlay: false, // Disable error overlay for faster updates
    },
    // Optimize deps pre-bundling
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        'zustand',
        'framer-motion',
        'hls.js',
        'lucide-react'
      ],
      exclude: ['@tauri-apps/api'] // Exclude Tauri in web build
    },
    watch: {
      ignored: ["**/src-tauri/**", "**/node_modules/**", "**/.git/**"],
      usePolling: false,
    },
  },

  // CSS optimizations
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },

  // Esbuild optimizations
  esbuild: {
    target: 'es2020',
    legalComments: 'none',
    treeShaking: true,
  },

  // Pre-bundling optimizations
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },

  clearScreen: false,
}));
