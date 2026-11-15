import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { IconPencil, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { AnchorLink } from '../components/AnchorLink.tsx'
import { confirmDelete } from '../components/confirm.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/QueryBoundary.tsx'
import { SortableTh } from '../components/SortableTh.tsx'
import {
  allEmployeesQuery,
  type Department,
  deleteDepartment,
  departmentsQuery,
} from '../lib/api.ts'
import { useApiMutation } from '../lib/mutation.ts'
import { compareBy, useSort } from '../lib/useSort.ts'
import { openDepartmentForm } from './DepartmentForm.tsx'

type SortKey = 'deptCode' | 'name' | 'count'

export function DepartmentsPage() {
  const departments = useQuery(departmentsQuery)
  const employees = useQuery(allEmployeesQuery)
  const [query, setQuery] = useState('')
  const sort = useSort<SortKey>('deptCode')

  const remove = useApiMutation({
    mutationFn: (deptCode: string) => deleteDepartment(deptCode),
    success: '部署を削除しました',
    errors: {
      409: '社員が所属している部署は削除できません。先に社員を移動または削除してください。',
    },
  })

  const countOf = (deptCode: string) =>
    (employees.data ?? []).filter((e) => e.deptCode === deptCode).length

  const keyword = query.trim().toLowerCase()
  const rows = (departments.data ?? [])
    .filter(
      (d) =>
        !keyword ||
        d.name.toLowerCase().includes(keyword) ||
        d.deptCode.toLowerCase().includes(keyword),
    )
    .sort(
      compareBy<Department>((d) => {
        if (sort.key === 'count') return countOf(d.deptCode)
        return sort.key === 'name' ? d.name : d.deptCode
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
    <>
      <PageHeader
        title="部署"
        description="部署の一覧と管理。部署名をクリックすると所属社員を表示します。"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => openDepartmentForm()}>
            部署を追加
          </Button>
        }
      />
      <QueryBoundary
        isPending={departments.isPending}
        error={departments.error}
        onRetry={() => departments.refetch()}
      >
        <Card>
          <Group mb="md" gap="sm">
            <TextInput
              placeholder="部署名・コードで検索"
              aria-label="部署を検索"
              leftSection={<IconSearch size={16} />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Text size="sm" c="dimmed" aria-live="polite">
              {rows.length} / {departments.data?.length ?? 0} 件
            </Text>
          </Group>

          {rows.length === 0 ? (
            <EmptyState
              title={
                departments.data?.length ? '条件に一致する部署がありません' : '部署がまだありません'
              }
            >
              {!departments.data?.length && (
                <Button variant="light" size="xs" onClick={() => openDepartmentForm()}>
                  最初の部署を追加
                </Button>
              )}
            </EmptyState>
          ) : (
            <Table.ScrollContainer minWidth={480}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    {th('deptCode', 'コード')}
                    {th('name', '部署名')}
                    {th('count', '社員数')}
                    <Table.Th w={96} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((d) => {
                    const count = countOf(d.deptCode)
                    return (
                      <Table.Tr key={d.deptCode}>
                        <Table.Td>
                          <Text size="sm" ff="monospace">
                            {d.deptCode}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <AnchorLink
                            to="/departments/$deptCode"
                            params={{ deptCode: d.deptCode }}
                            fw={600}
                            size="sm"
                          >
                            {d.name}
                          </AnchorLink>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={count ? 'indigo' : 'gray'}>
                            {employees.isPending ? '…' : `${count}人`}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} justify="flex-end" wrap="nowrap">
                            <Tooltip label="編集">
                              <ActionIcon
                                variant="subtle"
                                aria-label={`${d.name}を編集`}
                                onClick={() => openDepartmentForm(d)}
                              >
                                <IconPencil size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label={count ? '社員がいる部署は削除できません' : '削除'}>
                              {/* disabled のボタンは Tooltip が反応しないため span で包む */}
                              <span>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  disabled={count > 0}
                                  aria-label={`${d.name}を削除`}
                                  onClick={() =>
                                    confirmDelete({
                                      title: '部署を削除しますか?',
                                      message: `${d.name}(${d.deptCode}) を削除します。`,
                                      onConfirm: () => remove.mutate(d.deptCode),
                                    })
                                  }
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </span>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      </QueryBoundary>
    </>
  )
}
