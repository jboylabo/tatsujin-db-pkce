import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { me, renderAt, stubFetch } from './helpers.tsx'

const emp = (employeeId: string, name: string, deptCode: string, age = 40) => ({
  employeeId,
  name,
  birthDate: '1985-04-12',
  deptCode,
  age,
})

describe('未ログイン', () => {
  it('ホームにログインボタン(/auth/login へのリンク)を表示する', async () => {
    stubFetch({ 'GET /api/me': () => ({ status: 401, body: { error: 'unauthorized' } }) })
    renderAt('/')
    const link = await screen.findByRole('link', { name: /ログイン/ })
    expect(link).toHaveAttribute('href', '/auth/login')
    // 未ログインではナビゲーションを出さない
    expect(
      screen.queryByRole('navigation', { name: 'メインナビゲーション' }),
    ).not.toBeInTheDocument()
  })

  it('保護ページでは /auth/login へ遷移させる', async () => {
    stubFetch({ 'GET /api/me': () => ({ status: 401 }) })
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    renderAt('/departments')
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/auth/login'))
    expect(screen.queryByRole('heading', { name: '部署' })).not.toBeInTheDocument()
  })
})

describe('ダッシュボード', () => {
  it('自社の統計とユーザー情報を表示し、ナビゲーションが出る', async () => {
    stubFetch({
      'GET /api/me': () => ({ body: me }),
      'GET /api/departments': () => ({
        body: [
          { deptCode: 'D01', name: '開発部' },
          { deptCode: 'D02', name: '営業部' },
        ],
      }),
      'GET /api/employees': () => ({
        body: [emp('E001', '山田', 'D01', 40), emp('E002', '佐藤', 'D02', 30)],
      }),
    })
    renderAt('/')
    expect(await screen.findByText('アクメ株式会社')).toBeInTheDocument()
    expect(await screen.findByText('35')).toBeInTheDocument() // 平均年齢
    expect(screen.getByRole('navigation', { name: 'メインナビゲーション' })).toBeInTheDocument()
    expect(screen.getByText(/社員ID E001/)).toBeInTheDocument()
  })

  it('テーマ切替でダークモードになる', async () => {
    stubFetch({
      'GET /api/me': () => ({ body: me }),
      'GET /api/departments': () => ({ body: [] }),
      'GET /api/employees': () => ({ body: [] }),
    })
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await screen.findByRole('button', { name: 'テーマ切替' }))
    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark'),
    )
  })
})

describe('部署', () => {
  const baseRoutes = () => {
    let depts = [
      { deptCode: 'D01', name: '開発部' },
      { deptCode: 'D02', name: '営業部' },
    ]
    return {
      get depts() {
        return depts
      },
      routes: {
        'GET /api/me': () => ({ body: me }),
        'GET /api/departments': () => ({ body: depts }),
        'GET /api/employees': () => ({ body: [emp('E001', '山田', 'D01')] }),
        'POST /api/departments': (init?: RequestInit) => {
          const d = JSON.parse(init?.body as string) as { deptCode: string; name: string }
          depts = [...depts, d]
          return { status: 201, body: d }
        },
      },
    }
  }

  it('一覧に社員数が出て、社員がいる部署は削除できない', async () => {
    stubFetch(baseRoutes().routes)
    renderAt('/departments')
    expect(await screen.findByRole('link', { name: '開発部' })).toBeInTheDocument()
    expect(await screen.findByText('1人')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '開発部を削除' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '営業部を削除' })).toBeEnabled()
  })

  it('追加モーダル: 空入力は日本語のエラーを出し API を呼ばない。入力すると追加される', async () => {
    const state = baseRoutes()
    const calls = stubFetch(state.routes)
    const user = userEvent.setup()
    renderAt('/departments')

    await user.click(await screen.findByRole('button', { name: '部署を追加' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '追加' }))
    // コード・名前の両方が「必須項目です」になる(文字種のエラーが混ざらない)
    expect(await within(dialog).findAllByText('必須項目です')).toHaveLength(2)
    expect(
      within(dialog).queryByText(/半角英数字・ハイフン・アンダースコアのみ/),
    ).not.toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST')).toBe(false)

    await user.type(within(dialog).getByLabelText(/部署コード/), 'D03')
    await user.type(within(dialog).getByLabelText(/部署名/), '総務部')
    await user.click(within(dialog).getByRole('button', { name: '追加' }))

    expect(await screen.findByRole('link', { name: '総務部' })).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'POST')?.body).toBe('{"deptCode":"D03","name":"総務部"}')
    expect(await screen.findByText('部署を追加しました')).toBeInTheDocument()
  })

  it('削除は確認モーダルを経由し、409 のときはエラー通知を出す', async () => {
    const state = baseRoutes()
    stubFetch({
      ...state.routes,
      'DELETE /api/departments/D02': () => ({ status: 409, body: { error: 'conflict' } }),
    })
    const user = userEvent.setup()
    renderAt('/departments')
    await user.click(await screen.findByRole('button', { name: '営業部を削除' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/営業部\(D02\) を削除します/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '削除する' }))
    expect(await screen.findByText(/社員が所属している部署は削除できません/)).toBeInTheDocument()
  })
})

describe('社員', () => {
  it('全社員一覧で検索できる', async () => {
    stubFetch({
      'GET /api/me': () => ({ body: me }),
      'GET /api/departments': () => ({ body: [{ deptCode: 'D01', name: '開発部' }] }),
      'GET /api/employees': () => ({
        body: [emp('E001', '山田 太郎', 'D01'), emp('E002', '佐藤 花子', 'D01')],
      }),
    })
    const user = userEvent.setup()
    renderAt('/employees')
    expect(await screen.findByRole('link', { name: '山田 太郎' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: '社員を検索' }), '佐藤')
    expect(screen.queryByRole('link', { name: '山田 太郎' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '佐藤 花子' })).toBeInTheDocument()
    expect(screen.getByText('1 / 2 件')).toBeInTheDocument()
  })

  const detailRoutes = (getChildren: () => unknown[]) => ({
    'GET /api/me': () => ({ body: me }),
    'GET /api/departments': () => ({ body: [{ deptCode: 'D01', name: '開発部' }] }),
    'GET /api/employees/E001': () => ({
      body: { ...emp('E001', '山田 太郎', 'D01', 41), children: getChildren() },
    }),
  })

  it('社員詳細で子を追加できる。空入力は zod 検証で API を呼ばない', async () => {
    let children = [{ seq: 1, name: '山田 一' }]
    const calls = stubFetch({
      ...detailRoutes(() => children),
      'POST /api/employees/E001/children': (init) => {
        const { name } = JSON.parse(init?.body as string) as { name: string }
        children = [...children, { seq: 2, name }]
        return { status: 201, body: { seq: 2, name } }
      },
    })
    const user = userEvent.setup()
    renderAt('/employees/E001')

    expect(await screen.findByText('山田 一')).toBeInTheDocument()
    expect(screen.getByText('子 (1人)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(await screen.findByText('必須項目です')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST')).toBe(false)

    await user.type(screen.getByRole('textbox', { name: '子の名前' }), '山田 二')
    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(await screen.findByText('山田 二')).toBeInTheDocument()
    expect(screen.getByText('子 (2人)')).toBeInTheDocument()
  })

  it('子の削除は確認モーダルを経由して DELETE を呼ぶ', async () => {
    let children = [{ seq: 1, name: '山田 一' }]
    const calls = stubFetch({
      ...detailRoutes(() => children),
      'DELETE /api/employees/E001/children/1': () => {
        children = []
        return { status: 204 }
      },
    })
    const user = userEvent.setup()
    renderAt('/employees/E001')
    await user.click(await screen.findByRole('button', { name: '山田 一を削除' }))
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false) // 確認前は呼ばない
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '削除する' }),
    )
    await waitFor(() => expect(screen.queryByText('山田 一')).not.toBeInTheDocument())
    expect(calls.some((c) => c.method === 'DELETE' && c.path.endsWith('/children/1'))).toBe(true)
  })

  it('存在しない社員は「見つかりません」を表示する', async () => {
    stubFetch({
      'GET /api/me': () => ({ body: me }),
      'GET /api/departments': () => ({ body: [] }),
      'GET /api/employees/NOPE': () => ({ status: 404, body: { error: 'not found' } }),
    })
    renderAt('/employees/NOPE')
    expect(await screen.findByText('社員が見つかりません')).toBeInTheDocument()
  })
})
