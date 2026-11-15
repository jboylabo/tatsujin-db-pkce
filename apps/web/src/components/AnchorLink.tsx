import { Anchor, type AnchorProps } from '@mantine/core'
import { createLink, type LinkComponent } from '@tanstack/react-router'
import { forwardRef } from 'react'

type BaseProps = Omit<AnchorProps, 'href'> &
  Omit<React.ComponentPropsWithoutRef<'a'>, 'style' | 'color'>

const MantineAnchor = forwardRef<HTMLAnchorElement, BaseProps>((props, ref) => (
  <Anchor ref={ref} {...props} />
))
MantineAnchor.displayName = 'MantineAnchor'

const Created = createLink(MantineAnchor)

/** Mantine の Anchor 見た目 + TanStack Router の型付き遷移(to / params) */
export const AnchorLink: LinkComponent<typeof MantineAnchor> = (props) => (
  <Created preload="intent" {...props} />
)
