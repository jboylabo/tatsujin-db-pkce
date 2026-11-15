import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { createAppRouter } from '../src/router.tsx'
import { theme } from '../src/theme.ts'

export const me = {
  id: '01',
  email: 'alice@acme.example',
  companyCode: 'ACME',
  companyName: 'アクメ株式会社',
  employeeId: 'E001',
  role: 'admin',
}

export type Handler = (init?: RequestInit) => { status?: number; body?: unknown }
export type Call = { path: string; method: string; body?: string }

/** fetch をパス別スタブに差し替える。キーは "METHOD /path?query" */
export function stubFetch(routes: Record<string, Handler>) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ path, method, body: init?.body as string | undefined })
      const handler = routes[`${method} ${path}`]
      if (!handler)
        return new Response(`{"error":"not stubbed: ${method} ${path}"}`, { status: 500 })
      const { status = 200, body } = handler(init)
      return new Response(body === undefined ? null : JSON.stringify(body), { status })
    }),
  )
  return calls
}

/** 本番(main.tsx)と同じプロバイダー構成で、指定URLから描画する */
export function renderAt(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [url] }))
  return render(
    <MantineProvider theme={theme} defaultColorScheme="light">
      <DatesProvider settings={{ locale: 'ja' }}>
        <QueryClientProvider client={queryClient}>
          <ModalsProvider>
            <Notifications />
            <RouterProvider router={router} />
          </ModalsProvider>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>,
  )
}
