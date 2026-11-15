import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:3000'

export default defineConfig({
  // React Compiler(babel-plugin-react-compiler)。useMemo/useCallback/memo を手書きしない
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    port: 5173,
    strictPort: true,
    // BFF パターン: 同一オリジンにして Cookie と Origin 検証をそのまま通す
    proxy: {
      '/api': { target: API_ORIGIN },
      '/auth': { target: API_ORIGIN },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
})
