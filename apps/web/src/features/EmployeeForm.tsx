import { Button, Group, Select, Stack, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { useQuery } from '@tanstack/react-query'
import { employeeInput, employeeUpdate } from '@tatsujin/shared'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { createEmployee, departmentsQuery, type Employee, updateEmployee } from '../lib/api.ts'
import { useApiMutation } from '../lib/mutation.ts'

type Props = { employee?: Employee; defaultDeptCode?: string }

function EmployeeForm({ employee, defaultDeptCode }: Props) {
  const editing = !!employee
  const departments = useQuery(departmentsQuery)
  const form = useForm({
    mode: 'controlled',
    initialValues: {
      employeeId: employee?.employeeId ?? '',
      name: employee?.name ?? '',
      birthDate: employee?.birthDate ?? '',
      deptCode: employee?.deptCode ?? defaultDeptCode ?? '',
    },
    validate: zod4Resolver(editing ? employeeUpdate : employeeInput),
  })

  const save = useApiMutation({
    mutationFn: (v: typeof form.values) =>
      editing
        ? updateEmployee(v.employeeId, {
            name: v.name,
            birthDate: v.birthDate,
            deptCode: v.deptCode,
          })
        : createEmployee(v),
    success: editing ? '社員を更新しました' : '社員を追加しました',
    errors: {
      409: 'この社員IDは既に使われています',
      422: '選択した部署が存在しません',
    },
    onDone: () => modals.closeAll(),
  })

  return (
    <form onSubmit={form.onSubmit((v) => save.mutate(v))}>
      <Stack>
        <TextInput
          label="社員ID"
          description="半角英数字・ハイフン・アンダースコア、20文字以内"
          placeholder="E003"
          withAsterisk
          disabled={editing}
          data-autofocus={!editing}
          {...form.getInputProps('employeeId')}
        />
        <TextInput
          label="氏名"
          placeholder="山田 太郎"
          withAsterisk
          data-autofocus={editing}
          {...form.getInputProps('name')}
        />
        <DateInput
          label="生年月日"
          description="年齢は保存せず、生年月日から計算します"
          placeholder="1990年01月01日"
          valueFormat="YYYY年MM月DD日"
          maxDate={new Date()}
          defaultLevel="decade"
          withAsterisk
          clearable
          {...form.getInputProps('birthDate')}
        />
        <Select
          label="部署"
          placeholder={departments.isPending ? '読み込み中…' : '部署を選択'}
          withAsterisk
          searchable
          nothingFoundMessage="該当する部署がありません"
          data={(departments.data ?? []).map((d) => ({
            value: d.deptCode,
            label: `${d.name} (${d.deptCode})`,
          }))}
          {...form.getInputProps('deptCode')}
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={() => modals.closeAll()}>
            キャンセル
          </Button>
          <Button type="submit" loading={save.isPending}>
            {editing ? '更新' : '追加'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

export function openEmployeeForm(props: Props = {}) {
  modals.open({
    title: props.employee ? `社員を編集: ${props.employee.name}` : '社員を追加',
    centered: true,
    children: <EmployeeForm {...props} />,
  })
}
