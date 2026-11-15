import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { meQuery, UnauthorizedError } from '../lib/api.ts'

export function HomePage() {
  const me = useQuery({ ...meQuery, retry: false })

  if (me.isPending) return <p>読み込み中…</p>

  if (me.error instanceof UnauthorizedError) {
    return (
      <section>
        <h1>ログイン</h1>
        <p>認可コードフロー + PKCE(S256) で認証します。</p>
        {/* 通常のページ遷移で BFF の /auth/login へ(IdP へリダイレクトされる) */}
        <a className="button" href="/auth/login">
          ログイン
        </a>
      </section>
    )
  }

  if (me.error) return <p role="alert">エラー: {me.error.message}</p>

  return (
    <section>
      <h1>ようこそ</h1>
      <dl>
        <dt>会社</dt>
        <dd>
          {me.data.companyName} ({me.data.companyCode})
        </dd>
        <dt>メール</dt>
        <dd>{me.data.email}</dd>
        <dt>社員ID</dt>
        <dd>{me.data.employeeId}</dd>
        <dt>ロール</dt>
        <dd>{me.data.role}</dd>
      </dl>
      <Link to="/departments" className="button">
        部署一覧へ
      </Link>
    </section>
  )
}
