import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from '@tanstack/react-router'
import { DepartmentsPage } from './features/DepartmentsPage.tsx'
import { EmployeeDetailPage } from './features/EmployeeDetailPage.tsx'
import { EmployeesPage } from './features/EmployeesPage.tsx'
import { HomePage } from './features/HomePage.tsx'
import { Layout } from './features/Layout.tsx'
import { meQuery, UnauthorizedError } from './lib/api.ts'

type RouterContext = { queryClient: QueryClient }

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
})

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })

/**
 * 認証が必要なルート群。未ログイン(401)なら /auth/login へ遷移させる。
 * useEffect は使わず、ルーターの beforeLoad で判定する。
 */
const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authed',
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(meQuery)
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        window.location.assign('/auth/login')
        // ページ遷移が完了するまで、保護されたページを描画しない
        return new Promise<never>(() => {})
      }
      throw e
    }
  },
  component: Outlet,
})

const departmentsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/departments',
  component: DepartmentsPage,
})

const employeesRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/departments/$deptCode',
  component: EmployeesPage,
})

const employeeRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/employees/$employeeId',
  component: EmployeeDetailPage,
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  authedRoute.addChildren([departmentsRoute, employeesRoute, employeeRoute]),
])

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({ routeTree, context: { queryClient }, history })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
