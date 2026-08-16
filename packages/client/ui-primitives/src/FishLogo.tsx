import type { IconProps } from './icons/props.ts'

/** Render the compact Hyperlake product mark. */
export function FishLogo({ size = 24, className }: IconProps) {
  return (
    <img
      src="/hyperlake-logo.png"
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}
