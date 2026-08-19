import { cn } from '@/lib/utils'

interface HavenLogoProps {
  size?: number
  showText?: boolean
  className?: string
}

export function HavenLogo({ size = 32, showText = false, className }: HavenLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-haven-400 to-haven-600 shadow-lg shadow-haven-500/20"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-dark-950 animate-pulse" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-bold bg-gradient-to-l from-haven-400 to-haven-300 bg-clip-text text-transparent leading-tight">
            HAVEN
          </span>
          <span className="text-[10px] text-dark-500 font-medium tracking-wider">YOUR SAFE PLACE</span>
        </div>
      )}
    </div>
  )
}
