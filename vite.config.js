import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Every VITE_-prefixed variable is readable in the browser, so a service_role
 * key must never carry that prefix - it bypasses Row Level Security entirely.
 * Supabase keys are JWTs whose payload names the role, so decode and check.
 */
const assertNoServiceRoleInClientEnv = (mode) => {
  const env = loadEnv(mode, __dirname, 'VITE_')
  for (const [name, value] of Object.entries(env)) {
    const payload = String(value).split('.')[1]
    if (!payload) continue
    try {
      if (JSON.parse(Buffer.from(payload, 'base64').toString()).role === 'service_role') {
        throw new Error(
          `${name} holds a service_role key. VITE_-prefixed variables are inlined ` +
          'into the client bundle - rename it to SUPABASE_SERVICE_ROLE_KEY (no prefix) ' +
          'and read it only from Node scripts or edge functions.'
        )
      }
    } catch (err) {
      if (err instanceof SyntaxError) continue // not a JWT, nothing to check
      throw err
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  assertNoServiceRoleInClientEnv(mode)
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
  }
})
