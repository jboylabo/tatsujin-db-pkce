import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { UnauthorizedError } from './lib/api.ts'
import { createAppRouter } from './router.tsx'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 401 はリトライしても無意味
      retry: (count, error) => !(error instanceof UnauthorizedError) && count < 2,
      staleTime: 30_000,
    },
  },
})
const router = createAppRouter(queryClient)

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
