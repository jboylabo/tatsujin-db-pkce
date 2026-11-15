import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { childInput } from '@tatsujin/shared'
import { useState } from 'react'
import { addChild, employeeQuery, removeChild } from '../lib/api.ts'

export function EmployeeDetailPage() {
  const { employeeId } = useParams({ from: '/authed/employees/$employeeId' })
  const queryClient = useQueryClient()
  const employee = useQuery(employeeQuery(employeeId))
  const [formError, setFormError] = useState<string>()

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: employeeQuery(employeeId).queryKey })

  const add = useMutation({
    mutationFn: (name: string) => addChild(employeeId, { name }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (seq: number) => removeChild(employeeId, seq),
    onSuccess: refresh,
  })

  if (employee.isPending) return <p>読み込み中…</p>
  if (employee.error) return <p role="alert">エラー: {employee.error.message}</p>
  const e = employee.data

  return (
    <section>
      <p>
        <Link to="/departments/$deptCode" params={{ deptCode: e.deptCode }}>
          ← 部署の社員一覧
        </Link>
      </p>
      <h1>{e.name}</h1>
      <dl>
        <dt>社員ID</dt>
        <dd>{e.employeeId}</dd>
        <dt>生年月日</dt>
        <dd>
          {e.birthDate}（{e.age}歳）
        </dd>
        <dt>部署</dt>
        <dd>{e.deptCode}</dd>
      </dl>

      <h2>子</h2>
      {e.children.length === 0 ? (
        <p>登録されていません。</p>
      ) : (
        <ul className="list">
          {e.children.map((c) => (
            <li key={c.seq}>
              <span>{c.name}</span>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => remove.mutate(c.seq)}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="inline-form"
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          // 入力検証は API と同じ zod スキーマ(@tatsujin/shared)
          const parsed = childInput.safeParse({ name: new FormData(form).get('name') })
          if (!parsed.success) {
            setFormError('名前を入力してください(100文字以内)')
            return
          }
          setFormError(undefined)
          add.mutate(parsed.data.name, { onSuccess: () => form.reset() })
        }}
      >
        <label>
          子の名前
          <input name="name" autoComplete="off" />
        </label>
        <button type="submit" disabled={add.isPending}>
          追加
        </button>
      </form>
      {formError && <p role="alert">{formError}</p>}
      {(add.error || remove.error) && (
        <p role="alert">エラー: {(add.error ?? remove.error)?.message}</p>
      )}
    </section>
  )
}
