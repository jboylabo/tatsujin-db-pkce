import {
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  companyCode: varchar('company_code', { length: 20 }).primaryKey(),
  name: text('name').notNull(),
})

export const departments = pgTable(
  'departments',
  {
    companyCode: varchar('company_code', { length: 20 })
      .notNull()
      .references(() => companies.companyCode),
    deptCode: varchar('dept_code', { length: 20 }).notNull(),
    name: text('name').notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyCode, t.deptCode] })],
)

export const employees = pgTable(
  'employees',
  {
    companyCode: varchar('company_code', { length: 20 }).notNull(),
    employeeId: varchar('employee_id', { length: 20 }).notNull(),
    name: text('name').notNull(),
    birthDate: date('birth_date').notNull(),
    deptCode: varchar('dept_code', { length: 20 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyCode, t.employeeId] }),
    foreignKey({
      columns: [t.companyCode, t.deptCode],
      foreignColumns: [departments.companyCode, departments.deptCode],
    }).onDelete('restrict'),
    index('employees_company_dept_idx').on(t.companyCode, t.deptCode),
  ],
)

export const employeeChildren = pgTable(
  'employee_children',
  {
    companyCode: varchar('company_code', { length: 20 }).notNull(),
    employeeId: varchar('employee_id', { length: 20 }).notNull(),
    seq: integer('seq').notNull(),
    name: text('name').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyCode, t.employeeId, t.seq] }),
    foreignKey({
      columns: [t.companyCode, t.employeeId],
      foreignColumns: [employees.companyCode, employees.employeeId],
    }).onDelete('cascade'),
  ],
)

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    oidcIssuer: text('oidc_issuer').notNull(),
    oidcSubject: text('oidc_subject').notNull(),
    email: text('email').notNull(),
    companyCode: varchar('company_code', { length: 20 }).notNull(),
    employeeId: varchar('employee_id', { length: 20 }).notNull(),
    role: varchar('role', { length: 20 }).$type<'admin' | 'member'>().notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('users_oidc_unique').on(t.oidcIssuer, t.oidcSubject),
    unique('users_employee_unique').on(t.companyCode, t.employeeId),
    foreignKey({
      columns: [t.companyCode, t.employeeId],
      foreignColumns: [employees.companyCode, employees.employeeId],
    }),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    /** セッショントークンの SHA-256 ハッシュ(hex) */
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
)
