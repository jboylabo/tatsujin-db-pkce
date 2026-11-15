import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import 'dayjs/locale/ja'

import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { UnauthorizedError } from './lib/api.ts'
import { createAppRouter } from './router.tsx'
import { theme } from './theme.ts'

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
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <DatesProvider settings={{ locale: 'ja' }}>
        {/* モーダル内のフォームも useQueryClient を使うため、QueryClientProvider を外側に置く */}
        <QueryClientProvider client={queryClient}>
          <ModalsProvider>
            <Notifications position="bottom-right" />
            <RouterProvider router={router} />
          </ModalsProvider>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
)
