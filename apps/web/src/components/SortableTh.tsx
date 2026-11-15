import { Center, Group, Table, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react'
import type { SortDir } from '../lib/useSort.ts'

type Props = {
  label: string
  active: boolean
  dir: SortDir
  onSort: () => void
}

export function SortableTh({ label, active, dir, onSort }: Props) {
  const Icon = active ? (dir === 'asc' ? IconChevronUp : IconChevronDown) : IconSelector
  return (
    <Table.Th
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={{ whiteSpace: 'nowrap' }}
    >
      <UnstyledButton onClick={onSort} aria-label={`${label}で並び替え`}>
        <Group gap={4} wrap="nowrap">
          <Text fw={600} size="sm">
            {label}
          </Text>
          <Center>
            <Icon size={14} opacity={active ? 1 : 0.4} />
          </Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  )
}
