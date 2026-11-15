import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Select,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { IconPencil, IconSearch, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { AnchorLink } from '../components/AnchorLink.tsx'
import { confirmDelete } from '../components/confirm.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { SortableTh } from '../components/SortableTh.tsx'
import { type Department, deleteEmployee, type Employee } from '../lib/api.ts'
import { useApiMutation } from '../lib/mutation.ts'
import { compareBy, useSort } from '../lib/useSort.ts'
import { openEmployeeForm } from './EmployeeForm.tsx'

type SortKey = 'employeeId' | 'name' | 'age' | 'dept'

type Props = {
  employees: Employee[]
  departments: Department[]
  /** 指定すると部署固定(部署フィルタと部署列を出さない) */
  lockedDeptCode?: string
}

export function EmployeeList({ employees, departments, lockedDeptCode }: Props) {
  const [query, setQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState<string | null>(null)
  const sort = useSort<SortKey>('employeeId')

  const deptName = (code: string) => departments.find((d) => d.deptCode === code)?.name ?? code

  const remove = useApiMutation({
    mutationFn: (employeeId: string) => deleteEmployee(employeeId),
    success: '社員を削除しました(子の情報も削除されます)',
    errors: { 409: 'ログインユーザーに紐づいている社員は削除できません' },
  })

  const keyword = query.trim().toLowerCase()
  const rows = employees
    .filter((e) => !deptFilter || e.deptCode === deptFilter)
    .filter(
      (e) =>
        !keyword ||
        e.name.toLowerCase().includes(keyword) ||
        e.employeeId.toLowerCase().includes(keyword),
    )
    .sort(
      compareBy<Employee>((e) => {
        switch (sort.key) {
          case 'age':
            return e.age
          case 'name':
            return e.name
          case 'dept':
            return deptName(e.deptCode)
          default:
            return e.employeeId
        }
      }, sort.dir),
    )

  const th = (key: SortKey, label: string) => (
    <SortableTh
      label={label}
      active={sort.key === key}
      dir={sort.dir}
      onSort={() => sort.toggle(key)}
    />
  )

  return (
    <Card>
      <Group mb="md" gap="sm" wrap="wrap">
        <TextInput
          placeholder="氏名・社員IDで検索"
          aria-label="社員を検索"
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        {!lockedDeptCode && (
          <Select
            placeholder="すべての部署"
            aria-label="部署で絞り込み"
            clearable
            data={departments.map((d) => ({ value: d.deptCode, label: d.name }))}
            value={deptFilter}
            onChange={setDeptFilter}
            w={200}
          />
        )}
        <Text size="sm" c="dimmed" aria-live="polite">
          {rows.length} / {employees.length} 件
        </Text>
      </Group>

      {rows.length === 0 ? (
        <EmptyState
          title={employees.length === 0 ? '社員がまだいません' : '条件に一致する社員がいません'}
        />
      ) : (
        <Table.ScrollContainer minWidth={560}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                {th('employeeId', '社員ID')}
                {th('name', '氏名')}
                {!lockedDeptCode && th('dept', '部署')}
                {th('age', '年齢')}
                <Table.Th w={96} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((e) => (
                <Table.Tr key={e.employeeId}>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {e.employeeId}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <AnchorLink
                      to="/employees/$employeeId"
                      params={{ employeeId: e.employeeId }}
                      fw={600}
                      size="sm"
                    >
                      {e.name}
                    </AnchorLink>
                  </Table.Td>
                  {!lockedDeptCode && (
                    <Table.Td>
                      <Badge variant="light" color="indigo">
                        {deptName(e.deptCode)}
                      </Badge>
                    </Table.Td>
                  )}
                  <Table.Td>{e.age}歳</Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip label="編集">
                        <ActionIcon
                          variant="subtle"
                          aria-label={`${e.name}を編集`}
                          onClick={() => openEmployeeForm({ employee: e })}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="削除">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={`${e.name}を削除`}
                          onClick={() =>
                            confirmDelete({
                              title: '社員を削除しますか?',
                              message: `${e.name}(${e.employeeId}) を削除します。登録されている子の情報も一緒に削除されます。`,
                              onConfirm: () => remove.mutate(e.employeeId),
                            })
                          }
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  )
}
