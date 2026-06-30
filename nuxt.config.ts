import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },


app: {
  head: {
    title: 'EchoRH',
    link: [
      {
        rel: 'manifest',
        href: '/manifest.webmanifest'
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/pwa-192x192.png'
      },
      {
        rel: 'apple-touch-icon',
        href: '/pwa-192x192.png'
      }
    ]
  }
},

  


  ssr: false,

  typescript: {
    strict: true
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt'
  ],

  tailwindcss: {
    configPath: '~/tailwind.config.ts'
  },

  alias: {
    '@': fileURLToPath(new URL('.', import.meta.url))
  },

  vite: {
    define: {
      'process.env.DEBUG': false
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: ''
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    strategies: 'generateSW',

  manifest: {
    id: "/",
    name: 'EchoRH',
    short_name: 'EchoRH',
    description: 'Application de gestion des ressources humaines',
    theme_color: '#2563eb',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    orientation: 'portrait',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      },
      {
      src: "/maskable-icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable"
      }
      ]
      }
  }
})