import { Text } from '@mantine/core'
import { modals } from '@mantine/modals'

/** 削除などの破壊的操作の確認モーダル */
export function confirmDelete(opts: { title: string; message: string; onConfirm: () => void }) {
  modals.openConfirmModal({
    title: opts.title,
    centered: true,
    children: <Text size="sm">{opts.message}</Text>,
    labels: { confirm: '削除する', cancel: 'キャンセル' },
    confirmProps: { color: 'red' },
    onConfirm: opts.onConfirm,
  })
}
