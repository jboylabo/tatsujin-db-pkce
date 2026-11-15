import { afterAll, describe, expect, it } from 'vitest'
import { ALICE, BOB, buildApp, client, jsonHeaders, loginAs, ORIGIN } from './helpers.ts'

afterAll(() => client.end())

const app = buildApp()
const send = (path: string, cookie: string, method = 'GET', body?: unknown) =>
  app.request(path, {
    method,
    headers: jsonHeaders(cookie),
    body: body === undefined ? undefined : JSON.stringify(body),
  })

describe('GET /api/me', () => {
  it('ログインユーザーの会社情報を返す', async () => {
    const { cookie } = await loginAs(ALICE.sub)
    const res = await send('/api/me', cookie)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      companyCode: 'ACME',
      employeeId: 'E001',
      role: 'admin',
    })
  })
})

describe('他社データの不可視', () => {
  it('一覧は自社のみ', async () => {
    const { cookie } = await loginAs(ALICE.sub)
    const depts = (await (await send('/api/departments', cookie)).json()) as { name: string }[]
    expect(depts.map((d) => d.name)).toEqual(['開発部', '営業部'])
    const emps = (await (await send('/api/employees', cookie)).json()) as { name: string }[]
    expect(emps.map((e) => e.name)).not.toContain('鈴木 一郎') // GLOBEX
  })

  it('同じ employee_id でも他社の社員データは自社の値だけが返る', async () => {
    const alice = await loginAs(ALICE.sub)
    const bob = await loginAs(BOB.sub)
    const a = (await (await send('/api/employees/E001', alice.cookie)).json()) as { name: string }
    const b = (await (await send('/api/employees/E001', bob.cookie)).json()) as { name: string }
    expect(a.name).toBe('山田 太郎')
    expect(b.name).toBe('鈴木 一郎')
  })

  it('他社にしか存在しない社員・部署は404（読み・更新・削除）', async () => {
    const { cookie } = await loginAs(BOB.sub)
    // E002/D02 は両社に存在するため、片側限定のデータを作って検証する
    const alice = await loginAs(ALICE.sub)
    await send('/api/departments', alice.cookie, 'POST', { deptCode: 'ONLYA', name: 'A専用' })
    await send('/api/employees', alice.cookie, 'POST', {
      employeeId: 'ONLYA1',
      name: 'A専用社員',
      birthDate: '1990-01-01',
      deptCode: 'ONLYA',
    })
    try {
      expect((await send('/api/departments/ONLYA', cookie)).status).toBe(404)
      expect((await send('/api/employees/ONLYA1', cookie)).status).toBe(404)
      expect(
        (
          await send('/api/employees/ONLYA1', cookie, 'PUT', {
            name: 'x',
            birthDate: '1990-01-01',
            deptCode: 'D01',
          })
        ).status,
      ).toBe(404)
      expect((await send('/api/employees/ONLYA1', cookie, 'DELETE')).status).toBe(404)
      expect(
        (await send('/api/employees/ONLYA1/children', cookie, 'POST', { name: 'x' })).status,
      ).toBe(404)
      expect((await send('/api/departments/ONLYA', cookie, 'DELETE')).status).toBe(404)
      // 他社の部署コードでの社員作成は拒否
      const res = await send('/api/employees', cookie, 'POST', {
        employeeId: 'X1',
        name: 'x',
        birthDate: '1990-01-01',
        deptCode: 'ONLYA',
      })
      expect(res.status).toBe(422)
    } finally {
      await send('/api/employees/ONLYA1', alice.cookie, 'DELETE')
      await send('/api/departments/ONLYA', alice.cookie, 'DELETE')
    }
  })

  it('他社の子の削除は404で、自社の子は消えない', async () => {
    const alice = await loginAs(ALICE.sub)
    const bob = await loginAs(BOB.sub)
    // ACME E001 の seq=1 を GLOBEX の E001 として削除しようとしても GLOBEX の seq=1 のみが対象
    const before = (await (
      await send('/api/employees/E001/children', alice.cookie)
    ).json()) as unknown[]
    const res = await send('/api/employees/E002/children/1', bob.cookie, 'DELETE')
    expect(res.status).toBe(404)
    const after = (await (
      await send('/api/employees/E001/children', alice.cookie)
    ).json()) as unknown[]
    expect(after).toHaveLength(before.length)
  })
})

describe('CSRF: Origin 検証', () => {
  it('Origin なし/不一致の状態変更は403', async () => {
    const { cookie } = await loginAs(ALICE.sub)
    const body = JSON.stringify({ name: '太郎' })
    const noOrigin = await app.request('/api/employees/E001/children', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body,
    })
    expect(noOrigin.status).toBe(403)
    const evil = await app.request('/api/employees/E001/children', {
      method: 'POST',
      headers: { cookie, origin: 'https://evil.example', 'content-type': 'application/json' },
      body,
    })
    expect(evil.status).toBe(403)
    // GET は Origin 不要
    expect((await app.request('/api/me', { headers: { cookie } })).status).toBe(200)
    expect(ORIGIN).toBeTruthy()
  })
})

describe('CRUD', () => {
  it('子の追加(seq自動採番)・削除と年齢計算', async () => {
    const { cookie } = await loginAs(ALICE.sub)
    const created = await send('/api/employees/E002/children', cookie, 'POST', { name: '佐藤 子' })
    expect(created.status).toBe(201)
    const { seq } = (await created.json()) as { seq: number }
    const detail = (await (await send('/api/employees/E002', cookie)).json()) as {
      age: number
      children: unknown[]
    }
    expect(detail.children).toHaveLength(1)
    expect(detail.age).toBeGreaterThanOrEqual(35)
    expect((await send(`/api/employees/E002/children/${seq}`, cookie, 'DELETE')).status).toBe(204)
  })

  it('入力はzodで検証される(422ではなく400)', async () => {
    const { cookie } = await loginAs(ALICE.sub)
    const res = await send('/api/employees', cookie, 'POST', {
      employeeId: 'E9',
      name: '',
      birthDate: 'bad',
      deptCode: 'D01',
    })
    expect(res.status).toBe(400)
  })

  it('社員が所属する部署の削除は409、社員削除で子はCASCADE', async () => {
    const { cookie } = await loginAs(ALICE.sub)
    expect((await send('/api/departments/D01', cookie, 'DELETE')).status).toBe(409)

    await send('/api/employees', cookie, 'POST', {
      employeeId: 'T1',
      name: 'テスト',
      birthDate: '2000-02-29',
      deptCode: 'D02',
    })
    await send('/api/employees/T1/children', cookie, 'POST', { name: '子' })
    expect((await send('/api/employees/T1', cookie, 'DELETE')).status).toBe(204)
    expect((await send('/api/employees/T1', cookie)).status).toBe(404)
  })

  it('ユーザーに紐づく社員の削除は409', async () => {
    const { cookie } = await loginAs(ALICE.sub)
    expect((await send('/api/employees/E001', cookie, 'DELETE')).status).toBe(409)
  })
})
