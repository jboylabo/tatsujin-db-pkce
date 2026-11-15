import { ulid } from 'ulid'
import { companies, createDb, departments, employeeChildren, employees, users } from './index.ts'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')
const issuer = process.env.OIDC_ISSUER
if (!issuer) throw new Error('OIDC_ISSUER is required')

const { db, client } = createDb(url)

// infra/keycloak/realm.json のテストユーザーIDと一致させる(= oidc_subject)
const ALICE_SUB = '11111111-1111-4111-8111-111111111111'
const BOB_SUB = '22222222-2222-4222-8222-222222222222'

await db.transaction(async (tx) => {
  await tx.delete(users)
  await tx.delete(employeeChildren)
  await tx.delete(employees)
  await tx.delete(departments)
  await tx.delete(companies)

  await tx.insert(companies).values([
    { companyCode: 'ACME', name: 'アクメ株式会社' },
    { companyCode: 'GLOBEX', name: 'グローベックス株式会社' },
  ])
  await tx.insert(departments).values([
    { companyCode: 'ACME', deptCode: 'D01', name: '開発部' },
    { companyCode: 'ACME', deptCode: 'D02', name: '営業部' },
    { companyCode: 'GLOBEX', deptCode: 'D01', name: '総務部' },
    { companyCode: 'GLOBEX', deptCode: 'D02', name: '経理部' },
  ])
  await tx.insert(employees).values([
    {
      companyCode: 'ACME',
      employeeId: 'E001',
      name: '山田 太郎',
      birthDate: '1985-04-12',
      deptCode: 'D01',
    },
    {
      companyCode: 'ACME',
      employeeId: 'E002',
      name: '佐藤 花子',
      birthDate: '1990-09-30',
      deptCode: 'D02',
    },
    {
      companyCode: 'GLOBEX',
      employeeId: 'E001',
      name: '鈴木 一郎',
      birthDate: '1982-01-05',
      deptCode: 'D01',
    },
    {
      companyCode: 'GLOBEX',
      employeeId: 'E002',
      name: '高橋 次郎',
      birthDate: '1995-12-20',
      deptCode: 'D02',
    },
  ])
  await tx.insert(employeeChildren).values([
    { companyCode: 'ACME', employeeId: 'E001', seq: 1, name: '山田 一' },
    { companyCode: 'ACME', employeeId: 'E001', seq: 2, name: '山田 二' },
    { companyCode: 'GLOBEX', employeeId: 'E001', seq: 1, name: '鈴木 三' },
  ])
  await tx.insert(users).values([
    {
      id: ulid(),
      oidcIssuer: issuer,
      oidcSubject: ALICE_SUB,
      email: 'alice@acme.example',
      companyCode: 'ACME',
      employeeId: 'E001',
      role: 'admin',
    },
    {
      id: ulid(),
      oidcIssuer: issuer,
      oidcSubject: BOB_SUB,
      email: 'bob@globex.example',
      companyCode: 'GLOBEX',
      employeeId: 'E001',
      role: 'member',
    },
  ])
})

await client.end()
console.log('seeded')
