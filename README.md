# tatsujin-db-pkce
## 目的
書籍「達人に学ぶDB設計徹底指南書」の正規化の題材（会社・部署・社員・子）を使い、
認可コードフロー + PKCE(S256) で認証する学習用アプリをモノレポで構築する。

# 技術スタック
- Node.js v24（.nvmrc と engines で固定）、pnpm workspaces、TypeScript、Biome、Vitest
- FE: React + Vite（apps/web）useEffectは使用しない。TanStack QueryかフレームワークのTanStack Startを推奨
- BE: Hono + @hono/node-server（apps/api）
- DB: PostgreSQL（Docker）+ Drizzle ORM / drizzle-kit
- 認証: Keycloak（Docker、start-dev）、OIDCクライアントは openid-client v6
- 将来 Cognito に差し替えられるよう、IdP固有の処理は書かず標準OIDCのみ使う
  （issuer / client_id / client_secret は環境変数）

# ディレクトリ構成
- apps/web, apps/api
- packages/db（Drizzleスキーマ・マイグレーション・seed）
- packages/shared（zodスキーマと型）
- infra/docker-compose.yml、infra/keycloak/realm.json、infra/postgres/init.sql

# インフラ
- Postgres 1コンテナに app と keycloak の2DBを init.sql で作成
- Keycloak は --import-realm で realm.json を読み込む
  - realm: tatsujin
  - client: app-bff（confidential、Standard Flowのみ、PKCE S256必須）
  - redirect: http://localhost:5173/auth/callback
  - テストユーザー2名（別会社所属）
- ポート: web 5173 / api 3000 / keycloak 8080 / postgres 5432

# DBスキーマ（第3正規形・自然キー中心）
- companies(company_code PK, name)
- departments(PK(company_code, dept_code), name, FK→companies)
- employees(PK(company_code, employee_id), name, birth_date, dept_code,
  FK(company_code, dept_code)→departments ON DELETE RESTRICT)
  INDEX(company_code, dept_code)
- employee_children(PK(company_code, employee_id, seq), name,
  FK→employees ON DELETE CASCADE)
- users(id ULID PK, oidc_issuer, oidc_subject, email, company_code, employee_id,
  role, created_at)
  UNIQUE(oidc_issuer, oidc_subject), UNIQUE(company_code, employee_id), FK→employees
- sessions(id = セッショントークンのSHA-256ハッシュ PK, user_id FK CASCADE,
  expires_at, created_at)
  INDEX(user_id), INDEX(expires_at)
- 年齢は保存せず birth_date から計算する。列持ち（子1, 子2…）は禁止
- seed: 2社分の部署・社員・子、Keycloakテストユーザーに対応する users

# 認証（BFFパターン、トークンはブラウザに渡さない）
- 開発時は Vite proxy で /api と /auth を Hono に転送し、同一オリジンにする
- GET /auth/login
  - code_verifier・state・nonce を生成
  - AES-GCMで暗号化したCookie（HttpOnly, SameSite=Lax, 10分）に保存してIdPへリダイレクト
- GET /auth/callback
  - state を検証し、PKCEでトークン交換、ID Tokenを検証
  - (iss, sub) で users を検索。未登録なら403
  - ランダム32バイトのセッショントークンを発行し、DBにはハッシュのみ保存
  - Cookie: HttpOnly, SameSite=Lax, 本番のみSecure
- POST /auth/logout
  - セッションを削除し、IdPの end_session（id_token_hint付き）へリダイレクト
- 認証ミドルウェアで c.set('user', { id, companyCode, role })
- ドメインAPIのクエリは必ず company_code で絞り込む（他社データ不可視をテストで保証）
- 状態変更系は Origin ヘッダを検証してCSRFを防ぐ

# API
- GET /api/me
- departments / employees / employee_children のCRUD
- 入力は packages/shared の zod で検証

# FE
- ログインボタン、/me 表示、部署一覧→社員一覧→社員詳細（子の追加・削除）
- 未ログイン時は /auth/login へ誘導。状態管理は最小限

# 進め方
1. 足場（モノレポ, docker-compose, Keycloak起動確認）
2. DBスキーマ, マイグレーション, seed
3. 認証フロー
4. API
5. FE
6. テスト（PKCE検証失敗・他社アクセス拒否を含む）とREADME
- 各フェーズ完了ごとに止まり、動作確認手順と結果を報告すること
- 秘密情報は .env に置き、.env.example を用意する
# 起動手順（開発）
```sh
pnpm install
pnpm env:init     # ランダムな秘密値で .env を生成（git管理外）。5432使用中なら POSTGRES_PORT=5433 pnpm env:init
pnpm infra:up     # Postgres + Keycloak
pnpm db:migrate && pnpm db:seed
pnpm dev:api      # http://localhost:3000
pnpm dev:web      # http://localhost:5173 （/api と /auth を api にproxy）
```
- ブラウザで http://localhost:5173 を開き「ログイン」。ユーザーは `alice`（ACME）/ `bob`（GLOBEX）、パスワードは `.env` の `TEST_USER_PASSWORD`
- FE は React 19 + Vite + TanStack Query/Router。React Compiler（babel-plugin-react-compiler）を有効化しており、`useMemo`/`useCallback`/`memo` は手書きしない。`useEffect` は使用しない
- テスト: `pnpm test` / 型: `pnpm typecheck` / lint: `pnpm lint`
