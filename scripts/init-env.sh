#!/bin/sh
# .env をランダムな秘密値で生成する。既に存在する場合は上書きしない。
set -eu
cd "$(dirname "$0")/.."

if [ -e .env ]; then
  echo ".env は既に存在します。変更しません。" >&2
  exit 0
fi

rand() { openssl rand -hex "$1"; }
PORT_PG="${POSTGRES_PORT:-5432}"
PG_PASS="$(rand 16)"

sed \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASS}|" \
  -e "s|^POSTGRES_PORT=.*|POSTGRES_PORT=${PORT_PG}|" \
  -e "s|^KEYCLOAK_ADMIN_PASSWORD=.*|KEYCLOAK_ADMIN_PASSWORD=$(rand 16)|" \
  -e "s|^TEST_USER_PASSWORD=.*|TEST_USER_PASSWORD=$(rand 12)|" \
  -e "s|^DATABASE_URL=.*|DATABASE_URL=postgres://postgres:${PG_PASS}@localhost:${PORT_PG}/app|" \
  -e "s|^OIDC_CLIENT_SECRET=.*|OIDC_CLIENT_SECRET=$(rand 32)|" \
  -e "s|^COOKIE_SECRET=.*|COOKIE_SECRET=$(rand 32)|" \
  .env.example > .env
chmod 600 .env
echo ".env を生成しました（テストユーザーのパスワードは .env の TEST_USER_PASSWORD）"
