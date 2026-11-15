import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { departmentsQuery } from '../lib/api.ts'

export function DepartmentsPage() {
  const { data, error, isPending } = useQuery(departmentsQuery)

  if (isPending) return <p>読み込み中…</p>
  if (error) return <p role="alert">エラー: {error.message}</p>

  return (
    <section>
      <h1>部署一覧</h1>
      <ul className="list">
        {data.map((d) => (
          <li key={d.deptCode}>
            <Link to="/departments/$deptCode" params={{ deptCode: d.deptCode }}>
              {d.name}
            </Link>
            <small>{d.deptCode}</small>
          </li>
        ))}
      </ul>
    </section>
  )
}
