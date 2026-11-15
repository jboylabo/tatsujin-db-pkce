import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { departmentsQuery, employeesQuery } from '../lib/api.ts'

export function EmployeesPage() {
  const { deptCode } = useParams({ from: '/authed/departments/$deptCode' })
  const departments = useQuery(departmentsQuery)
  const employees = useQuery(employeesQuery(deptCode))

  if (employees.isPending) return <p>読み込み中…</p>
  if (employees.error) return <p role="alert">エラー: {employees.error.message}</p>

  const deptName = departments.data?.find((d) => d.deptCode === deptCode)?.name ?? deptCode

  return (
    <section>
      <p>
        <Link to="/departments">← 部署一覧</Link>
      </p>
      <h1>{deptName} の社員</h1>
      <table>
        <thead>
          <tr>
            <th>社員ID</th>
            <th>氏名</th>
            <th>年齢</th>
          </tr>
        </thead>
        <tbody>
          {employees.data.map((e) => (
            <tr key={e.employeeId}>
              <td>{e.employeeId}</td>
              <td>
                <Link to="/employees/$employeeId" params={{ employeeId: e.employeeId }}>
                  {e.name}
                </Link>
              </td>
              <td>{e.age}歳</td>
            </tr>
          ))}
        </tbody>
      </table>
      {employees.data.length === 0 && <p>社員はいません。</p>}
    </section>
  )
}
