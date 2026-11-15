import { existsSync } from 'node:fs'

// ルートの .env があれば読み込む(CIでは環境変数を直接渡す)
const envFile = new URL('../../../.env', import.meta.url)
if (existsSync(envFile)) process.loadEnvFile(envFile)
