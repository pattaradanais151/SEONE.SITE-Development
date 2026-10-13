import { useId } from 'react'
import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'

// แสงวิ่งผ่านโลโก้ตอน hover
const shine = keyframes`
  0%   { transform: translateX(-140%) skewX(-20deg); }
  100% { transform: translateX(260%) skewX(-20deg); }
`

const Wrapper = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => Math.round($size * 0.36)}px;
  color: ${({ $color }) => $color};
  line-height: 1;
  text-decoration: none;

  .se-logo-mark {
    transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .se-logo-mark::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.55) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: translateX(-140%) skewX(-20deg);
    pointer-events: none;
  }

  &:hover .se-logo-mark {
    transform: translateY(-1px) scale(1.06);
  }
  &:hover .se-logo-mark::after {
    animation: ${shine} 0.8s ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .se-logo-mark,
    &:hover .se-logo-mark {
      transform: none;
      transition: none;
    }
    &:hover .se-logo-mark::after {
      animation: none;
    }
  }
`

const Mark = styled.span`
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  overflow: hidden;
  border-radius: ${({ $size }) => Math.round($size * 0.28)}px;
  box-shadow:
    0 1px 2px rgba(0, 113, 227, 0.35),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.25);
`

const Wordmark = styled.span`
  font-size: ${({ $size }) => Math.round($size * 0.68)}px;
  font-weight: 600;
  letter-spacing: -0.02em;
  white-space: nowrap;
`

/**
 * โลโก้ SE-ONE
 * @param {number}  size     ขนาดของไอคอน (px)  ค่าเริ่มต้น 28
 * @param {boolean} showText แสดงคำว่า SE-ONE ข้างไอคอนหรือไม่
 * @param {string}  color    สีตัวอักษร
 */
export default function Logo({ size = 28, showText = true, color = '#1d1d1f', className }) {
  const gid = `se-grad-${useId().replace(/:/g, '')}`

  return (
    <Wrapper $size={size} $color={color} className={className}>
      <Mark className="se-logo-mark" $size={size} aria-hidden={showText ? 'true' : undefined}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          role={showText ? undefined : 'img'}
          aria-label={showText ? undefined : 'SE-ONE'}
        >
          <defs>
            <linearGradient id={gid} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#2997ff" />
              <stop offset="1" stopColor="#0058c8" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" fill={`url(#${gid})`} />
          {/* < / > */}
          <g stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.5 11 L7.5 16 L12.5 21" />
            <path d="M19.5 11 L24.5 16 L19.5 21" />
            <path d="M17.6 9.8 L14.4 22.2" />
          </g>
        </svg>
      </Mark>
      {showText && <Wordmark $size={size}>SE-ONE</Wordmark>}
    </Wrapper>
  )
}