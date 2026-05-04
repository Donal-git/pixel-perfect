import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  ssr: false,

  typescript: {
    strict: true
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt'
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
      apiBase: '/api'
    }
  }
})