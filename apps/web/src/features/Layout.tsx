import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink,
  Text,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconBuilding,
  IconDatabase,
  IconHome,
  IconLogout,
  IconMoon,
  IconSun,
  IconUsers,
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { meQuery } from '../lib/api.ts'

const NAV = [
  { to: '/', label: 'ホーム', icon: IconHome, match: (p: string) => p === '/' },
  {
    to: '/departments',
    label: '部署',
    icon: IconBuilding,
    match: (p: string) => p.startsWith('/departments'),
  },
  {
    to: '/employees',
    label: '社員',
    icon: IconUsers,
    match: (p: string) => p.startsWith('/employees'),
  },
] as const

export function Layout({ children }: { children: ReactNode }) {
  const me = useQuery({ ...meQuery, retry: false })
  const [opened, { toggle, close }] = useDisclosure()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { setColorScheme } = useMantineColorScheme()
  const scheme = useComputedColorScheme('light')
  const loggedIn = !!me.data

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 232,
        breakpoint: 'sm',
        collapsed: { mobile: !opened, desktop: !loggedIn },
      }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            {loggedIn && (
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
                aria-label="メニュー"
              />
            )}
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Group gap={8}>
                <IconDatabase size={22} />
                <Text fw={800} size="lg">
                  達人DB
                </Text>
              </Group>
            </Link>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Tooltip label={scheme === 'dark' ? 'ライトモード' : 'ダークモード'}>
              <ActionIcon
                variant="default"
                size="lg"
                aria-label="テーマ切替"
                onClick={() => setColorScheme(scheme === 'dark' ? 'light' : 'dark')}
              >
                {scheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>

            {me.data && (
              <Menu position="bottom-end" width={240} shadow="md">
                <Menu.Target>
                  <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="ユーザーメニュー">
                    <Avatar size={30} radius="xl" color="indigo">
                      {me.data.email.slice(0, 1).toUpperCase()}
                    </Avatar>
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>
                    {me.data.companyName}
                    <Text size="xs" c="dimmed" truncate>
                      {me.data.email}
                    </Text>
                  </Menu.Label>
                  <Menu.Divider />
                  {/* BFF のログアウトは POST。同一オリジンのフォーム送信なので Origin ヘッダが付く */}
                  <form method="post" action="/auth/logout">
                    <Menu.Item
                      component="button"
                      type="submit"
                      color="red"
                      leftSection={<IconLogout size={16} />}
                    >
                      ログアウト
                    </Menu.Item>
                  </form>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      {loggedIn && (
        <AppShell.Navbar p="sm" aria-label="メインナビゲーション">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              component={Link}
              to={item.to}
              label={item.label}
              leftSection={<item.icon size={18} />}
              active={item.match(pathname)}
              onClick={close}
              style={{ borderRadius: 'var(--mantine-radius-md)' }}
            />
          ))}
        </AppShell.Navbar>
      )}

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
