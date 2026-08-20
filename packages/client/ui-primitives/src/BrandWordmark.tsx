import type { IconProps } from './icons/props.ts'

/** Display options for the Hyperlake SuperHarness wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading Hyperlake mark; defaults to true. */
  includeMark?: boolean | undefined
}

/** Render the Hyperlake SuperHarness product wordmark. */
export function BrandWordmark({ size = 24, className, includeMark = true }: BrandWordmarkProps) {
  return (
    <span
      className={className}
      aria-label="Hyperlake SuperHarness"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}
    >
      {includeMark
        ? <img
          src="/hyperlake-logo.png"
          alt=""
          width={size + 4}
          height={size + 4}
          style={{ display: 'block', objectFit: 'contain', flex: 'none' }}
        />
        : null}
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 15, lineHeight: 1, fontWeight: 700 }}>Hyperlake</span>
        <span style={{ fontSize: 9, lineHeight: 1, fontWeight: 700, letterSpacing: 0 }}>SUPERHARNESS</span>
      </span>
    </span>
  )
}
