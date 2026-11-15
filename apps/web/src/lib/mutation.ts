import { notifications } from '@mantine/notifications'
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createElement } from 'react'
import { ApiError } from './api.ts'

type Options<TVars, TData> = {
  mutationFn: (vars: TVars) => Promise<TData>
  /** 成功時の通知メッセージ */
  success: string
  /** ステータス別のエラーメッセージ(409 など) */
  errors?: Partial<Record<number, string>>
  onDone?: (data: TData, vars: TVars) => void
}

/**
 * 更新系の共通処理: 成功で通知 + 全クエリ再取得、失敗でステータス別の通知。
 * 小規模なので invalidate は全体で行う(整合性を優先)。
 */
export function useApiMutation<TVars, TData = unknown>(opts: Options<TVars, TData>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: opts.mutationFn,
    onSuccess: async (data, vars) => {
      await queryClient.invalidateQueries()
      notifications.show({
        message: opts.success,
        color: 'teal',
        icon: createElement(IconCheck, { size: 16 }),
      })
      opts.onDone?.(data, vars)
    },
    onError: (error) => {
      const status = error instanceof ApiError ? error.status : undefined
      const message =
        (status && opts.errors?.[status]) ||
        (status === 403 ? '権限がありません' : undefined) ||
        'エラーが発生しました。時間をおいて再度お試しください。'
      notifications.show({
        title: '操作に失敗しました',
        message,
        color: 'red',
        icon: createElement(IconAlertTriangle, { size: 16 }),
      })
    },
  })
}
