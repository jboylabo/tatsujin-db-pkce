import { Breadcrumbs, Button, Text } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { AnchorLink } from '../components/AnchorLink.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/QueryBoundary.tsx'
import { departmentsQuery, employeesQuery } from '../lib/api.ts'
import { openEmployeeForm } from './EmployeeForm.tsx'
import { EmployeeList } from './EmployeeList.tsx'

/** 部署別の社員一覧 */
export function EmployeesPage() {
  const { deptCode } = useParams({ from: '/authed/departments/$deptCode' })
  const departments = useQuery(departmentsQuery)
  const employees = useQuery(employeesQuery(deptCode))
  const dept = departments.data?.find((d) => d.deptCode === deptCode)

  return (
    <>
      <PageHeader
        title={dept ? `${dept.name} の社員` : '社員'}
        description={`部署コード: ${deptCode}`}
        breadcrumbs={
          <Breadcrumbs>
            <AnchorLink to="/departments" size="sm">
              部署
            </AnchorLink>
            <Text size="sm">{dept?.name ?? deptCode}</Text>
          </Breadcrumbs>
        }
        actions={
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => openEmployeeForm({ defaultDeptCode: deptCode })}
          >
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
        <EmployeeList
          employees={employees.data ?? []}
          departments={departments.data ?? []}
          lockedDeptCode={deptCode}
        />
      </QueryBoundary>
    </>
  )
}
