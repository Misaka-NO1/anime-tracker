// ===== 全局确认弹窗：以 Promise 风格 API 替代原生 window.confirm =====
// 用法：const ok = await confirm({ title, description?, confirmText?, destructive? })
// 样式与应用的 shadcn AlertDialog 体系一致，在 Electron 无边框窗口里不突兀。

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  destructive?: boolean
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  async () => false,
)

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // 上一个尚未应答的确认直接视为取消，避免 resolver 泄漏
      resolver.current?.(false)
      resolver.current = resolve
      setState(opts)
    })
  }, [])

  const settle = (v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={state !== null} onOpenChange={(o) => !o && settle(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state?.title}</AlertDialogTitle>
            {state?.description && (
              <AlertDialogDescription>{state.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>取消</AlertDialogCancel>
            <AlertDialogAction
              className={
                state?.destructive
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
              onClick={() => settle(true)}
            >
              {state?.confirmText ?? '确定'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}
