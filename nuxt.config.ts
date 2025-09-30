// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/test-utils',
    '@nuxt/ui'
  ],

  runtimeConfig: {
    GOOGLE_API_KEY: process.env.NUXT_GOOGLE_API_KEY || '',
    public: {} // クライアント側で使う変数があればここに
  }
})