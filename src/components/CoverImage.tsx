// ===== 封面图：加载失败自动重试（代理偶发抖动时不至于永久变占位图），最终失败才回退占位 =====

import { useEffect, useRef, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  src?: string
  alt: string
  className?: string
}

/** 重试间隔：1s / 3s / 8s，之后放弃 */
const RETRY_DELAYS = [1000, 3000, 8000]

export function CoverImage({ src, alt, className }: Props) {
  const [retry, setRetry] = useState(0)
  const [failed, setFailed] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  // 切换图片（翻页/换条目）时重置状态并清理未触发的重试
  useEffect(() => {
    setRetry(0)
    setFailed(false)
    return () => window.clearTimeout(timer.current)
  }, [src])

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
      // key 带重试次数：失败后强制重新挂载 img，发起新的网络请求
      key={`${src}#${retry}`}
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (retry < RETRY_DELAYS.length) {
          timer.current = window.setTimeout(() => setRetry((r) => r + 1), RETRY_DELAYS[retry])
        } else {
          setFailed(true)
        }
      }}
      className={cn('object-cover', className)}
    />
  )
}
