import { Box, Group, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  /** パンくず(Breadcrumbs 要素)。呼び出し側で組み立てる */
  breadcrumbs?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, breadcrumbs, actions }: Props) {
  return (
    <Box mb="lg">
      {breadcrumbs && <Box mb="xs">{breadcrumbs}</Box>}
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Box>
          <Title order={2}>{title}</Title>
          {description && (
            <Text c="dimmed" size="sm" mt={4}>
              {description}
            </Text>
          )}
        </Box>
        {actions}
      </Group>
    </Box>
  )
}
