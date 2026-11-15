import { queryOptions } from '@tanstack/react-query'
import type { ChildInput, DepartmentInput, EmployeeInput, Me } from '@tatsujin/shared'

export type Department = { deptCode: string; name: string }
export type Child = { seq: number; name: string }
export type Employee = {
  employeeId: string
  name: string
  birthDate: string
  deptCode: string
  age: number
}
export type EmployeeDetail = Employee & { children: Child[] }

/** セッションなし/期限切れ(401)。未ログインの判定に使う */
export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized')
  }
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // 同一オリジン(Vite proxy 経由)なので Cookie と Origin はブラウザが付与する
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(res.status, body.error ?? res.statusText)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

const enc = encodeURIComponent
const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) })

// ---- queries ----
export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => request<Me>('/api/me'),
})

export const departmentsQuery = queryOptions({
  queryKey: ['departments'],
  queryFn: () => request<Department[]>('/api/departments'),
})

/** 全社員(自社)。部署別も同じ一覧からフィルタできるが、サーバ側絞り込み版も用意する */
export const allEmployeesQuery = queryOptions({
  queryKey: ['employees', 'all'],
  queryFn: () => request<Employee[]>('/api/employees'),
})

export const employeesQuery = (deptCode: string) =>
  queryOptions({
    queryKey: ['employees', { deptCode }],
    queryFn: () => request<Employee[]>(`/api/employees?deptCode=${enc(deptCode)}`),
  })

export const employeeQuery = (employeeId: string) =>
  queryOptions({
    queryKey: ['employee', employeeId],
    queryFn: () => request<EmployeeDetail>(`/api/employees/${enc(employeeId)}`),
  })

// ---- mutations: departments ----
export const createDepartment = (input: DepartmentInput) =>
  request<Department>('/api/departments', json('POST', input))

export const updateDepartment = (deptCode: string, input: { name: string }) =>
  request<Department>(`/api/departments/${enc(deptCode)}`, json('PUT', input))

export const deleteDepartment = (deptCode: string) =>
  request<void>(`/api/departments/${enc(deptCode)}`, { method: 'DELETE' })

// ---- mutations: employees ----
export const createEmployee = (input: EmployeeInput) =>
  request<Employee>('/api/employees', json('POST', input))

export const updateEmployee = (
  employeeId: string,
  input: { name: string; birthDate: string; deptCode: string },
) => request<Employee>(`/api/employees/${enc(employeeId)}`, json('PUT', input))

export const deleteEmployee = (employeeId: string) =>
  request<void>(`/api/employees/${enc(employeeId)}`, { method: 'DELETE' })

// ---- mutations: children ----
export const addChild = (employeeId: string, input: ChildInput) =>
  request<Child>(`/api/employees/${enc(employeeId)}/children`, json('POST', input))

export const removeChild = (employeeId: string, seq: number) =>
  request<void>(`/api/employees/${enc(employeeId)}/children/${seq}`, { method: 'DELETE' })
