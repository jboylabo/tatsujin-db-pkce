import { queryOptions } from '@tanstack/react-query'
import type { ChildInput, Me } from '@tatsujin/shared'

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

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => request<Me>('/api/me'),
})

export const departmentsQuery = queryOptions({
  queryKey: ['departments'],
  queryFn: () => request<Department[]>('/api/departments'),
})

export const employeesQuery = (deptCode: string) =>
  queryOptions({
    queryKey: ['employees', { deptCode }],
    queryFn: () => request<Employee[]>(`/api/employees?deptCode=${encodeURIComponent(deptCode)}`),
  })

export const employeeQuery = (employeeId: string) =>
  queryOptions({
    queryKey: ['employee', employeeId],
    queryFn: () => request<EmployeeDetail>(`/api/employees/${encodeURIComponent(employeeId)}`),
  })

export const addChild = (employeeId: string, input: ChildInput) =>
  request<Child>(`/api/employees/${encodeURIComponent(employeeId)}/children`, {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const removeChild = (employeeId: string, seq: number) =>
  request<void>(`/api/employees/${encodeURIComponent(employeeId)}/children/${seq}`, {
    method: 'DELETE',
  })
