import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import webExtension from '@samrum/vite-plugin-web-extension'
import { resolve } from 'path'
import pkg from './package.json'

export default defineConfig({
  plugins: [
    vue(),
    webExtension({
      manifest: {
        name: pkg.name,
        description: pkg.description,
        version: pkg.version,
        manifest_version: 3,
        permissions: [
          'activeTab',
          'storage',
          'scripting',
          'tabs'
        ],
        host_permissions: [
          'https://musicleague.com/*',
          'https://*.musicleague.com/*',
          'https://app.musicleague.com/*'
        ],
        action: {
          default_popup: 'src/popup/index.html',
          default_title: 'Music League Companion'
        },
        background: {
          service_worker: 'src/background/index.ts'
        },
        content_scripts: [
          {
            matches: ['https://*.musicleague.com/*'],
            js: ['src/content/index.ts'],
            run_at: 'document_end'
          }
        ],
        icons: {
          '16': 'icon-16.png',
          '32': 'icon-32.png',
          '48': 'icon-48.png',
          '128': 'icon-128.png'
        }
      }
    })
  ],
  publicDir: 'assets',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/index.ts')
      }
    }
  }
}) 