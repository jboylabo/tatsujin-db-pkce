import { Alert, Button, Skeleton, Stack } from '@mantine/core'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'
import type { ReactNode } from 'react'

type Props = {
  isPending: boolean
  error: Error | null
  onRetry: () => void
  rows?: number
  children: ReactNode
}

/** 取得中は Skeleton、失敗時は再試行ボタン付きのエラー、成功時は children を表示する */
export function QueryBoundary({ isPending, error, onRetry, rows = 5, children }: Props) {
  if (isPending) {
    return (
      <Stack gap="sm" aria-busy="true" aria-label="読み込み中">
        {Array.from({ length: rows }, (_, i) => (
          // 並び替えのない固定長のプレースホルダなので index キーで問題ない
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={i} height={44} radius="md" />
        ))}
      </Stack>
    )
  }
  if (error) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={18} />} title="データを取得できませんでした">
        <Stack gap="xs" align="flex-start">
          {error.message}
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconRefresh size={14} />}
            onClick={onRetry}
          >
            再試行
          </Button>
        </Stack>
      </Alert>
    )
  }
  return children
}
