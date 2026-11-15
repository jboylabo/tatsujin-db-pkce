import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { meQuery } from '../lib/api.ts'

export function Layout({ children }: { children: ReactNode }) {
  const me = useQuery({ ...meQuery, retry: false })

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          達人DB
        </Link>
        {me.data && (
          <>
            <nav>
              <Link to="/departments">部署</Link>
            </nav>
            <span className="spacer" />
            <span className="who">
              {me.data.companyName} / {me.data.email}
            </span>
            {/* BFF のログアウトは POST。同一オリジンのフォーム送信なので Origin ヘッダが付く */}
            <form method="post" action="/auth/logout">
              <button type="submit">ログアウト</button>
            </form>
          </>
        )}
      </header>
      <main>{children}</main>
    </>
  )
}
