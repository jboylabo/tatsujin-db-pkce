import {
  ActionIcon,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { childInput } from '@tatsujin/shared'
import dayjs from 'dayjs'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { AnchorLink } from '../components/AnchorLink.tsx'
import { confirmDelete } from '../components/confirm.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/QueryBoundary.tsx'
import {
  ApiError,
  addChild,
  deleteEmployee,
  departmentsQuery,
  employeeQuery,
  removeChild,
} from '../lib/api.ts'
import { useApiMutation } from '../lib/mutation.ts'
import { openEmployeeForm } from './EmployeeForm.tsx'

export function EmployeeDetailPage() {
  const { employeeId } = useParams({ from: '/authed/employees/$employeeId' })
  const navigate = useNavigate()
  const employee = useQuery(employeeQuery(employeeId))
  const departments = useQuery(departmentsQuery)

  const form = useForm({
    mode: 'controlled',
    initialValues: { name: '' },
    validate: zod4Resolver(childInput),
  })

  const add = useApiMutation({
    mutationFn: (name: string) => addChild(employeeId, { name }),
    success: '子を追加しました',
    onDone: () => form.reset(),
  })
  const removeOne = useApiMutation({
    mutationFn: (seq: number) => removeChild(employeeId, seq),
    success: '子を削除しました',
  })
  const removeEmployee = useApiMutation({
    mutationFn: () => deleteEmployee(employeeId),
    success: '社員を削除しました',
    errors: { 409: 'ログインユーザーに紐づいている社員は削除できません' },
    onDone: () => navigate({ to: '/employees' }),
  })

  if (employee.error instanceof ApiError && employee.error.status === 404) {
    return (
      <EmptyState title="社員が見つかりません">
        <Button component={Link} to="/employees" variant="light" size="xs">
          社員一覧へ戻る
        </Button>
      </EmptyState>
    )
  }

  const e = employee.data
  const dept = departments.data?.find((d) => d.deptCode === e?.deptCode)

  return (
    <QueryBoundary
      isPending={employee.isPending}
      error={employee.error}
      onRetry={() => employee.refetch()}
      rows={3}
    >
      {e && (
        <>
          <PageHeader
            title={e.name}
            breadcrumbs={
              <Breadcrumbs>
                <AnchorLink to="/employees" size="sm">
                  社員
                </AnchorLink>
                {dept && (
                  <AnchorLink
                    to="/departments/$deptCode"
                    params={{ deptCode: dept.deptCode }}
                    size="sm"
                  >
                    {dept.name}
                  </AnchorLink>
                )}
                <Text size="sm">{e.name}</Text>
              </Breadcrumbs>
            }
            actions={
              <Group gap="xs">
                <Button
                  variant="default"
                  leftSection={<IconPencil size={16} />}
                  onClick={() => openEmployeeForm({ employee: e })}
                >
                  編集
                </Button>
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  loading={removeEmployee.isPending}
                  onClick={() =>
                    confirmDelete({
                      title: '社員を削除しますか?',
                      message: `${e.name}(${e.employeeId}) を削除します。登録されている子の情報も一緒に削除されます。`,
                      onConfirm: () => removeEmployee.mutate(undefined),
                    })
                  }
                >
                  削除
                </Button>
              </Group>
            }
          />

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Card>
              <Group mb="md" wrap="nowrap">
                <Avatar size={56} radius="xl" color="indigo">
                  {e.name.slice(0, 1)}
                </Avatar>
                <div>
                  <Title order={4}>{e.name}</Title>
                  <Text size="sm" c="dimmed" ff="monospace">
                    {e.employeeId}
                  </Text>
                </div>
              </Group>
              <Divider mb="md" />
              <Stack gap="sm">
                <Row label="部署">
                  <Badge variant="light" color="indigo">
                    {dept?.name ?? e.deptCode}
                  </Badge>
                </Row>
                <Row label="生年月日">{dayjs(e.birthDate).locale('ja').format('YYYY年M月D日')}</Row>
                <Row label="年齢">{e.age}歳</Row>
              </Stack>
            </Card>

            <Card>
              <Group justify="space-between" mb="md">
                <Title order={4}>子 ({e.children.length}人)</Title>
              </Group>

              {e.children.length === 0 ? (
                <Text size="sm" c="dimmed" mb="md">
                  登録されている子はいません。
                </Text>
              ) : (
                <Stack gap={0} mb="md">
                  {e.children.map((c, i) => (
                    <div key={c.seq}>
                      {i > 0 && <Divider />}
                      <Group justify="space-between" py="xs" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                          <Badge variant="outline" color="gray" circle>
                            {c.seq}
                          </Badge>
                          <Text size="sm">{c.name}</Text>
                        </Group>
                        <Tooltip label="削除">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label={`${c.name}を削除`}
                            onClick={() =>
                              confirmDelete({
                                title: '子を削除しますか?',
                                message: `${c.name} を削除します。`,
                                onConfirm: () => removeOne.mutate(c.seq),
                              })
                            }
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </div>
                  ))}
                </Stack>
              )}

              {/* 子は列持ち(子1, 子2…)ではなく別テーブルの行として管理される */}
              <form onSubmit={form.onSubmit((v) => add.mutate(v.name))}>
                <Group align="flex-start" gap="xs" wrap="nowrap">
                  <TextInput
                    aria-label="子の名前"
                    placeholder="子の名前を入力"
                    autoComplete="off"
                    style={{ flex: 1 }}
                    {...form.getInputProps('name')}
                  />
                  <Button
                    type="submit"
                    leftSection={<IconPlus size={16} />}
                    loading={add.isPending}
                  >
                    追加
                  </Button>
                </Group>
              </form>
            </Card>
          </SimpleGrid>
        </>
      )}
    </QueryBoundary>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" component="div">
        {children}
      </Text>
    </Group>
  )
}
