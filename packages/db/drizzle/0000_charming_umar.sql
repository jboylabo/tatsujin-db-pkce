CREATE TABLE "companies" (
	"company_code" varchar(20) PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"company_code" varchar(20) NOT NULL,
	"dept_code" varchar(20) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "departments_company_code_dept_code_pk" PRIMARY KEY("company_code","dept_code")
);
--> statement-breakpoint
CREATE TABLE "employee_children" (
	"company_code" varchar(20) NOT NULL,
	"employee_id" varchar(20) NOT NULL,
	"seq" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "employee_children_company_code_employee_id_seq_pk" PRIMARY KEY("company_code","employee_id","seq")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"company_code" varchar(20) NOT NULL,
	"employee_id" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"birth_date" date NOT NULL,
	"dept_code" varchar(20) NOT NULL,
	CONSTRAINT "employees_company_code_employee_id_pk" PRIMARY KEY("company_code","employee_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(26) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"oidc_issuer" text NOT NULL,
	"oidc_subject" text NOT NULL,
	"email" text NOT NULL,
	"company_code" varchar(20) NOT NULL,
	"employee_id" varchar(20) NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_oidc_unique" UNIQUE("oidc_issuer","oidc_subject"),
	CONSTRAINT "users_employee_unique" UNIQUE("company_code","employee_id")
);
--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_code_companies_company_code_fk" FOREIGN KEY ("company_code") REFERENCES "public"."companies"("company_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_children" ADD CONSTRAINT "employee_children_company_code_employee_id_employees_company_code_employee_id_fk" FOREIGN KEY ("company_code","employee_id") REFERENCES "public"."employees"("company_code","employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_code_dept_code_departments_company_code_dept_code_fk" FOREIGN KEY ("company_code","dept_code") REFERENCES "public"."departments"("company_code","dept_code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_code_employee_id_employees_company_code_employee_id_fk" FOREIGN KEY ("company_code","employee_id") REFERENCES "public"."employees"("company_code","employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_company_dept_idx" ON "employees" USING btree ("company_code","dept_code");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");