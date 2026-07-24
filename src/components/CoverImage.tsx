// ===== 封面图：加载失败时回退占位 =====

import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  src?: string
  alt: string
  className?: string
}

export function CoverImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-muted to-muted/60 text-muted-foreground',
          className,
        )}
      >
        <ImageOff className="size-8 opacity-50" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}
