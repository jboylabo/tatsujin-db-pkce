import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily: "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif",
  headings: { fontWeight: '700' },
  components: {
    Card: { defaultProps: { withBorder: true, padding: 'lg' } },
    Button: { defaultProps: { fw: 600 } },
    Table: { defaultProps: { highlightOnHover: true, verticalSpacing: 'sm' } },
  },
})
