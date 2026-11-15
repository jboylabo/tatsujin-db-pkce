import {
  Avatar,
  Badge,
  Button,
  Card,
  Center,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { IconBuilding, IconCake, IconLogin2, IconShieldLock, IconUsers } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/QueryBoundary.tsx'
import { allEmployeesQuery, departmentsQuery, meQuery, UnauthorizedError } from '../lib/api.ts'

export function HomePage() {
  const me = useQuery({ ...meQuery, retry: false })

  if (me.error instanceof UnauthorizedError) return <LoginCard />

  return (
    <QueryBoundary isPending={me.isPending} error={me.error} onRetry={() => me.refetch()} rows={3}>
      {me.data && <Dashboard />}
    </QueryBoundary>
  )
}

function LoginCard() {
  return (
    <Center mih="calc(100vh - 160px)">
      <Card w="100%" maw={420} shadow="sm" padding="xl">
        <Stack align="center" gap="md">
          <ThemeIcon size={56} radius="xl" variant="light">
            <IconShieldLock size={30} />
          </ThemeIcon>
          <Title order={2}>達人DB にログイン</Title>
          <Text c="dimmed" size="sm" ta="center">
            会社・部署・社員の情報を管理します。
            <br />
            認証は IdP(OIDC) で行われ、トークンはブラウザに渡されません。
          </Text>
          {/* 通常のページ遷移で BFF の /auth/login へ(IdP へリダイレクトされる) */}
          <Button
            component="a"
            href="/auth/login"
            size="md"
            fullWidth
            leftSection={<IconLogin2 size={18} />}
          >
            ログイン
          </Button>
        </Stack>
      </Card>
    </Center>
  )
}

function Dashboard() {
  const me = useQuery(meQuery)
  const departments = useQuery(departmentsQuery)
  const employees = useQuery(allEmployeesQuery)

  const avgAge = employees.data?.length
    ? Math.round(employees.data.reduce((sum, e) => sum + e.age, 0) / employees.data.length)
    : undefined

  return (
    <>
      <PageHeader title="ダッシュボード" description="自社の概要" />

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
        <Stat
          icon={<IconBuilding size={22} />}
          label="部署"
          value={departments.data?.length}
          unit="部署"
          loading={departments.isPending}
          to="/departments"
        />
        <Stat
          icon={<IconUsers size={22} />}
          label="社員"
          value={employees.data?.length}
          unit="人"
          loading={employees.isPending}
          to="/employees"
        />
        <Stat
          icon={<IconCake size={22} />}
          label="平均年齢"
          value={avgAge}
          unit="歳"
          loading={employees.isPending}
        />
      </SimpleGrid>

      {me.data && (
        <Card>
          <Group wrap="nowrap">
            <Avatar size={56} radius="xl" color="indigo">
              {me.data.email.slice(0, 1).toUpperCase()}
            </Avatar>
            <div>
              <Group gap="xs">
                <Title order={4}>{me.data.companyName}</Title>
                <Badge variant="light" color={me.data.role === 'admin' ? 'grape' : 'gray'}>
                  {me.data.role}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {me.data.email} ・ 社員ID {me.data.employeeId} ・ 会社コード {me.data.companyCode}
              </Text>
            </div>
          </Group>
        </Card>
      )}
    </>
  )
}

function Stat(props: {
  icon: ReactNode
  label: string
  value: number | undefined
  unit: string
  loading: boolean
  to?: '/departments' | '/employees'
}) {
  const body = (
    <Card>
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text size="sm" c="dimmed">
            {props.label}
          </Text>
          {props.loading ? (
            <Skeleton height={32} width={80} mt={4} />
          ) : (
            <Text fz={28} fw={700} lh={1.3}>
              {props.value ?? '–'}
              <Text span size="sm" c="dimmed" ml={4}>
                {props.value === undefined ? '' : props.unit}
              </Text>
            </Text>
          )}
        </div>
        <ThemeIcon variant="light" size={44} radius="md">
          {props.icon}
        </ThemeIcon>
      </Group>
    </Card>
  )
  return props.to ? (
    <Link to={props.to} style={{ textDecoration: 'none', color: 'inherit' }}>
      {body}
    </Link>
  ) : (
    body
  )
}
