import { useState } from 'react'

export type SortDir = 'asc' | 'desc'

/** 列ヘッダのクリックで昇順→降順を切り替える並び替え状態 */
export function useSort<K extends string>(initial: K) {
  const [key, setKey] = useState<K>(initial)
  const [dir, setDir] = useState<SortDir>('asc')
  const toggle = (next: K) => {
    if (next === key) {
      setDir(dir === 'asc' ? 'desc' : 'asc')
    } else {
      setKey(next)
      setDir('asc')
    }
  }
  return { key, dir, toggle }
}

export function compareBy<T>(get: (row: T) => string | number, dir: SortDir) {
  return (a: T, b: T) => {
    const x = get(a)
    const y = get(b)
    const r =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), 'ja')
    return dir === 'asc' ? r : -r
  }
}
