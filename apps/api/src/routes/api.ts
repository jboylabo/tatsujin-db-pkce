import { zValidator } from '@hono/zod-validator'
import { type Db, schema } from '@tatsujin/db'
import {
  calcAge,
  childInput,
  departmentInput,
  departmentUpdate,
  employeeInput,
  employeeUpdate,
  type Me,
} from '@tatsujin/shared'
import { and, asc, eq, max } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Config } from '../config.ts'
import { type Env, originGuard, requireAuth } from '../middleware.ts'

const { companies, departments, employees, employeeChildren, users } = schema

export function apiRoutes(deps: { db: Db; cfg: Config }) {
  const { db, cfg } = deps
  const app = new Hono<Env>()
  app.use('*', originGuard(cfg), requireAuth(db))

  // 他社データは company_code で必ず絞り込む。company_code は常にセッション由来で、入力から受け取らない。
  const toEmployee = (e: typeof employees.$inferSelect) => ({
    employeeId: e.employeeId,
    name: e.name,
    birthDate: e.birthDate,
    deptCode: e.deptCode,
    age: calcAge(e.birthDate),
  })

  app.get('/me', async (c) => {
    const { id, companyCode } = c.get('user')
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        companyCode: users.companyCode,
        companyName: companies.name,
        employeeId: users.employeeId,
        role: users.role,
      })
      .from(users)
      .innerJoin(companies, eq(companies.companyCode, users.companyCode))
      .where(and(eq(users.id, id), eq(users.companyCode, companyCode)))
    if (!row) return c.json({ error: 'not found' }, 404)
    return c.json(row satisfies Me)
  })

  // ---- departments ----
  const deptWhere = (companyCode: string, deptCode: string) =>
    and(eq(departments.companyCode, companyCode), eq(departments.deptCode, deptCode))

  app.get('/departments', async (c) => {
    const { companyCode } = c.get('user')
    const rows = await db
      .select({ deptCode: departments.deptCode, name: departments.name })
      .from(departments)
      .where(eq(departments.companyCode, companyCode))
      .orderBy(asc(departments.deptCode))
    return c.json(rows)
  })

  app.post('/departments', zValidator('json', departmentInput), async (c) => {
    const { companyCode } = c.get('user')
    const body = c.req.valid('json')
    await db.insert(departments).values({ companyCode, ...body })
    return c.json(body, 201)
  })

  app.get('/departments/:deptCode', async (c) => {
    const { companyCode } = c.get('user')
    const [row] = await db
      .select({ deptCode: departments.deptCode, name: departments.name })
      .from(departments)
      .where(deptWhere(companyCode, c.req.param('deptCode')))
    return row ? c.json(row) : c.json({ error: 'not found' }, 404)
  })

  app.put('/departments/:deptCode', zValidator('json', departmentUpdate), async (c) => {
    const { companyCode } = c.get('user')
    const deptCode = c.req.param('deptCode')
    const [row] = await db
      .update(departments)
      .set(c.req.valid('json'))
      .where(deptWhere(companyCode, deptCode))
      .returning({ deptCode: departments.deptCode, name: departments.name })
    return row ? c.json(row) : c.json({ error: 'not found' }, 404)
  })

  app.delete('/departments/:deptCode', async (c) => {
    const { companyCode } = c.get('user')
    // 社員が所属していれば FK(ON DELETE RESTRICT) で 409
    const rows = await db
      .delete(departments)
      .where(deptWhere(companyCode, c.req.param('deptCode')))
      .returning({ deptCode: departments.deptCode })
    return rows.length ? c.body(null, 204) : c.json({ error: 'not found' }, 404)
  })

  // ---- employees ----
  const empWhere = (companyCode: string, employeeId: string) =>
    and(eq(employees.companyCode, companyCode), eq(employees.employeeId, employeeId))

  const deptExists = async (companyCode: string, deptCode: string) => {
    const [d] = await db
      .select({ deptCode: departments.deptCode })
      .from(departments)
      .where(deptWhere(companyCode, deptCode))
    return !!d
  }

  app.get('/employees', async (c) => {
    const { companyCode } = c.get('user')
    const deptCode = c.req.query('deptCode')
    const rows = await db
      .select()
      .from(employees)
      .where(
        deptCode
          ? and(eq(employees.companyCode, companyCode), eq(employees.deptCode, deptCode))
          : eq(employees.companyCode, companyCode),
      )
      .orderBy(asc(employees.employeeId))
    return c.json(rows.map(toEmployee))
  })

  app.post('/employees', zValidator('json', employeeInput), async (c) => {
    const { companyCode } = c.get('user')
    const body = c.req.valid('json')
    if (!(await deptExists(companyCode, body.deptCode))) {
      return c.json({ error: 'department not found' }, 422)
    }
    const [row] = await db
      .insert(employees)
      .values({ companyCode, ...body })
      .returning()
    return c.json(row ? toEmployee(row) : null, 201)
  })

  app.get('/employees/:employeeId', async (c) => {
    const { companyCode } = c.get('user')
    const employeeId = c.req.param('employeeId')
    const [row] = await db.select().from(employees).where(empWhere(companyCode, employeeId))
    if (!row) return c.json({ error: 'not found' }, 404)
    const children = await db
      .select({ seq: employeeChildren.seq, name: employeeChildren.name })
      .from(employeeChildren)
      .where(
        and(
          eq(employeeChildren.companyCode, companyCode),
          eq(employeeChildren.employeeId, employeeId),
        ),
      )
      .orderBy(asc(employeeChildren.seq))
    return c.json({ ...toEmployee(row), children })
  })

  app.put('/employees/:employeeId', zValidator('json', employeeUpdate), async (c) => {
    const { companyCode } = c.get('user')
    const body = c.req.valid('json')
    if (!(await deptExists(companyCode, body.deptCode))) {
      return c.json({ error: 'department not found' }, 422)
    }
    const [row] = await db
      .update(employees)
      .set(body)
      .where(empWhere(companyCode, c.req.param('employeeId')))
      .returning()
    return row ? c.json(toEmployee(row)) : c.json({ error: 'not found' }, 404)
  })

  app.delete('/employees/:employeeId', async (c) => {
    const { companyCode } = c.get('user')
    // 子は ON DELETE CASCADE。users が紐づく社員は FK で 409
    const rows = await db
      .delete(employees)
      .where(empWhere(companyCode, c.req.param('employeeId')))
      .returning({ employeeId: employees.employeeId })
    return rows.length ? c.body(null, 204) : c.json({ error: 'not found' }, 404)
  })

  // ---- employee_children ----
  const employeeExists = async (companyCode: string, employeeId: string) => {
    const [e] = await db
      .select({ employeeId: employees.employeeId })
      .from(employees)
      .where(empWhere(companyCode, employeeId))
    return !!e
  }

  app.get('/employees/:employeeId/children', async (c) => {
    const { companyCode } = c.get('user')
    const employeeId = c.req.param('employeeId')
    if (!(await employeeExists(companyCode, employeeId))) return c.json({ error: 'not found' }, 404)
    const rows = await db
      .select({ seq: employeeChildren.seq, name: employeeChildren.name })
      .from(employeeChildren)
      .where(
        and(
          eq(employeeChildren.companyCode, companyCode),
          eq(employeeChildren.employeeId, employeeId),
        ),
      )
      .orderBy(asc(employeeChildren.seq))
    return c.json(rows)
  })

  app.post('/employees/:employeeId/children', zValidator('json', childInput), async (c) => {
    const { companyCode } = c.get('user')
    const employeeId = c.req.param('employeeId')
    if (!(await employeeExists(companyCode, employeeId))) return c.json({ error: 'not found' }, 404)
    const body = c.req.valid('json')
    const created = await db.transaction(async (tx) => {
      // 同一社員への同時追加で seq が衝突しないよう、親行をロックして採番する
      await tx
        .select({ employeeId: employees.employeeId })
        .from(employees)
        .where(empWhere(companyCode, employeeId))
        .for('update')
      const [m] = await tx
        .select({ max: max(employeeChildren.seq) })
        .from(employeeChildren)
        .where(
          and(
            eq(employeeChildren.companyCode, companyCode),
            eq(employeeChildren.employeeId, employeeId),
          ),
        )
      const seq = (m?.max ?? 0) + 1
      await tx.insert(employeeChildren).values({ companyCode, employeeId, seq, name: body.name })
      return { seq, name: body.name }
    })
    return c.json(created, 201)
  })

  app.delete('/employees/:employeeId/children/:seq', async (c) => {
    const { companyCode } = c.get('user')
    const seq = Number(c.req.param('seq'))
    if (!Number.isInteger(seq)) return c.json({ error: 'invalid seq' }, 400)
    const rows = await db
      .delete(employeeChildren)
      .where(
        and(
          eq(employeeChildren.companyCode, companyCode),
          eq(employeeChildren.employeeId, c.req.param('employeeId')),
          eq(employeeChildren.seq, seq),
        ),
      )
      .returning({ seq: employeeChildren.seq })
    return rows.length ? c.body(null, 204) : c.json({ error: 'not found' }, 404)
  })

  return app
}
