import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const auth0Domain = env.VITE_AUTH0_DOMAIN || env.AUTH0_DOMAIN || ''
  const auth0ClientId = env.VITE_AUTH0_CLIENT_ID || env.AUTH0_CLIENT_ID || ''
  const auth0Enabled =
    env.VITE_AUTH0_ENABLED === 'true' ||
    (auth0Domain && auth0ClientId && env.VITE_AUTH0_ENABLED !== 'false')

  return {
  plugins: [react()],
  envPrefix: ['VITE_', 'AUTH0_'],
  define: {
    'import.meta.env.VITE_AUTH0_DOMAIN': JSON.stringify(auth0Domain),
    'import.meta.env.VITE_AUTH0_CLIENT_ID': JSON.stringify(auth0ClientId),
    'import.meta.env.VITE_AUTH0_ENABLED': JSON.stringify(auth0Enabled ? 'true' : 'false'),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        bypass(req) {
          if (req.url?.startsWith('/api/auth/callback')) return req.url;
        },
      },
    },
  },
  build: {
    // Raised to silence the chunk size warning (main bundle is ~523 kB because of the full admin portal,
    // heavy pages, Supabase client, Tailwind, etc.). App still works fine.
    chunkSizeWarningLimit: 1000,
  },
}})