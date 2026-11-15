import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createAppRouter } from '../src/router.tsx'

const me = {
  id: '01',
  email: 'alice@acme.example',
  companyCode: 'ACME',
  companyName: 'アクメ株式会社',
  employeeId: 'E001',
  role: 'admin',
}

type Handler = (init?: RequestInit) => { status?: number; body?: unknown }

/** fetch をパス別スタブに差し替える */
function stubFetch(routes: Record<string, Handler>) {
  const calls: { path: string; method: string; body?: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init?: RequestInit) => {
      calls.push({ path, method: init?.method ?? 'GET', body: init?.body as string | undefined })
      const handler = routes[`${init?.method ?? 'GET'} ${path}`]
      if (!handler) return new Response('{"error":"not stubbed"}', { status: 500 })
      const { status = 200, body } = handler(init)
      return new Response(body === undefined ? null : JSON.stringify(body), { status })
    }),
  )
  return calls
}

function renderAt(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [url] }))
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('未ログイン', () => {
  it('ホームにログインボタン(/auth/login へのリンク)を表示する', async () => {
    stubFetch({ 'GET /api/me': () => ({ status: 401, body: { error: 'unauthorized' } }) })
    renderAt('/')
    const link = await screen.findByRole('link', { name: 'ログイン' })
    expect(link).toHaveAttribute('href', '/auth/login')
  })

  it('保護ページでは /auth/login へ遷移させる', async () => {
    stubFetch({ 'GET /api/me': () => ({ status: 401 }) })
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    renderAt('/departments')
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/auth/login'))
    expect(screen.queryByText('部署一覧')).not.toBeInTheDocument()
  })
})

describe('ログイン済み', () => {
  it('ホームで /me の内容を表示する', async () => {
    stubFetch({ 'GET /api/me': () => ({ body: me }) })
    renderAt('/')
    expect(await screen.findByText('アクメ株式会社 (ACME)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
  })

  it('社員詳細で子を追加できる。空入力は zod 検証で API を呼ばない', async () => {
    let children = [{ seq: 1, name: '山田 一' }]
    const calls = stubFetch({
      'GET /api/me': () => ({ body: me }),
      'GET /api/employees/E001': () => ({
        body: {
          employeeId: 'E001',
          name: '山田 太郎',
          birthDate: '1985-04-12',
          deptCode: 'D01',
          age: 41,
          children,
        },
      }),
      'POST /api/employees/E001/children': (init) => {
        const { name } = JSON.parse(init?.body as string) as { name: string }
        children = [...children, { seq: 2, name }]
        return { status: 201, body: { seq: 2, name } }
      },
    })
    const user = userEvent.setup()
    renderAt('/employees/E001')

    expect(await screen.findByText('山田 一')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('名前を入力してください')
    expect(calls.some((c) => c.method === 'POST')).toBe(false)

    await user.type(screen.getByLabelText('子の名前'), '山田 二')
    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(await screen.findByText('山田 二')).toBeInTheDocument()
  })

  it('子の削除で DELETE を呼ぶ', async () => {
    let children = [{ seq: 1, name: '山田 一' }]
    const calls = stubFetch({
      'GET /api/me': () => ({ body: me }),
      'GET /api/employees/E001': () => ({
        body: {
          employeeId: 'E001',
          name: '山田 太郎',
          birthDate: '1985-04-12',
          deptCode: 'D01',
          age: 41,
          children,
        },
      }),
      'DELETE /api/employees/E001/children/1': () => {
        children = []
        return { status: 204 }
      },
    })
    const user = userEvent.setup()
    renderAt('/employees/E001')
    await user.click(await screen.findByRole('button', { name: '削除' }))
    await waitFor(() => expect(screen.queryByText('山田 一')).not.toBeInTheDocument())
    expect(calls.some((c) => c.method === 'DELETE' && c.path.endsWith('/children/1'))).toBe(true)
  })
})
