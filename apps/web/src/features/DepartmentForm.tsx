import { Button, Group, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { departmentInput, departmentUpdate } from '@tatsujin/shared'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { createDepartment, type Department, updateDepartment } from '../lib/api.ts'
import { useApiMutation } from '../lib/mutation.ts'

function DepartmentForm({ dept }: { dept?: Department }) {
  const editing = !!dept
  const form = useForm({
    mode: 'controlled',
    initialValues: { deptCode: dept?.deptCode ?? '', name: dept?.name ?? '' },
    // 入力検証は API と同じ zod スキーマ(@tatsujin/shared)
    validate: zod4Resolver(editing ? departmentUpdate : departmentInput),
  })

  const save = useApiMutation({
    mutationFn: (v: { deptCode: string; name: string }) =>
      editing ? updateDepartment(v.deptCode, { name: v.name }) : createDepartment(v),
    success: editing ? '部署を更新しました' : '部署を追加しました',
    errors: { 409: 'この部署コードは既に使われています' },
    onDone: () => modals.closeAll(),
  })

  return (
    <form onSubmit={form.onSubmit((v) => save.mutate(v))}>
      <Stack>
        <TextInput
          label="部署コード"
          description="半角英数字・ハイフン・アンダースコア、20文字以内"
          placeholder="D03"
          withAsterisk
          disabled={editing}
          data-autofocus={!editing}
          {...form.getInputProps('deptCode')}
        />
        <TextInput
          label="部署名"
          placeholder="開発部"
          withAsterisk
          data-autofocus={editing}
          {...form.getInputProps('name')}
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

export function openDepartmentForm(dept?: Department) {
  modals.open({
    title: dept ? `部署を編集: ${dept.name}` : '部署を追加',
    centered: true,
    children: <DepartmentForm dept={dept} />,
  })
}
