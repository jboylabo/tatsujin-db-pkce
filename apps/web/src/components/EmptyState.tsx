import { Center, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconInbox } from '@tabler/icons-react'
import type { ReactNode } from 'react'

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="xs">
        <ThemeIcon variant="light" color="gray" size={48} radius="xl">
          <IconInbox size={26} />
        </ThemeIcon>
        <Text fw={600}>{title}</Text>
        {children}
      </Stack>
    </Center>
  )
}
