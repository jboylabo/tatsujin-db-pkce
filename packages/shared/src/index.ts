import { z } from 'zod'

// メッセージは FE のフォームにもそのまま表示される
const code = z
  .string()
  .min(1, '必須項目です')
  .max(20, '20文字以内で入力してください')
  // 空文字は min(1) 側のメッセージ("必須項目です")だけを出すため、ここは * で許容する
  .regex(/^[A-Za-z0-9_-]*$/, '半角英数字・ハイフン・アンダースコアのみ使えます')
const name = z.string().trim().min(1, '必須項目です').max(100, '100文字以内で入力してください')

export const departmentInput = z.object({ deptCode: code, name })
export const departmentUpdate = z.object({ name })

export const employeeInput = z.object({
  employeeId: code,
  name,
  birthDate: z.iso.date('YYYY-MM-DD 形式の日付を入力してください'),
  deptCode: code,
})
export const employeeUpdate = employeeInput.omit({ employeeId: true })

export const childInput = z.object({ name })

export const roleSchema = z.enum(['admin', 'member'])

export type DepartmentInput = z.infer<typeof departmentInput>
export type EmployeeInput = z.infer<typeof employeeInput>
export type ChildInput = z.infer<typeof childInput>
export type Role = z.infer<typeof roleSchema>

export type Me = {
  id: string
  email: string
  companyCode: string
  companyName: string
  employeeId: string
  role: Role
}

/** 年齢は保存せず birth_date (YYYY-MM-DD) から計算する */
export function calcAge(birthDate: string, today: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number]
  let age = today.getFullYear() - y
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)
  if (beforeBirthday) age -= 1
  return age
}
