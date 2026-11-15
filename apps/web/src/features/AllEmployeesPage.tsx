import { Button } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/QueryBoundary.tsx'
import { allEmployeesQuery, departmentsQuery } from '../lib/api.ts'
import { openEmployeeForm } from './EmployeeForm.tsx'
import { EmployeeList } from './EmployeeList.tsx'

/** 自社の全社員 */
export function AllEmployeesPage() {
  const employees = useQuery(allEmployeesQuery)
  const departments = useQuery(departmentsQuery)

  return (
    <>
      <PageHeader
        title="社員"
        description="自社の全社員。氏名をクリックすると詳細と子の情報を表示します。"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => openEmployeeForm()}>
            社員を追加
          </Button>
        }
      />
      <QueryBoundary
        isPending={employees.isPending || departments.isPending}
        error={employees.error ?? departments.error}
        onRetry={() => {
          employees.refetch()
          departments.refetch()
        }}
      >
        <EmployeeList employees={employees.data ?? []} departments={departments.data ?? []} />
      </QueryBoundary>
    </>
  )
}
