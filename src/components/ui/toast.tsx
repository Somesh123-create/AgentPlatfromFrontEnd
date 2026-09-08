import { createContext, useContext, useMemo, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { Button } from './button'

type Toast = { id: number; title: string; message: string }
const ToastContext = createContext<{ show: (title: string, message: string) => void }>({ show: () => undefined })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const value = useMemo(() => ({ show: (title: string, message: string) => { const id = Date.now(); setToasts(items => [...items, { id, title, message }]); window.setTimeout(() => setToasts(items => items.filter(item => item.id !== id)), 4200) } }), [])
  return <ToastContext.Provider value={value}>{children}<div className="fixed bottom-5 right-5 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">{toasts.map(toast => <div key={toast.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={19} /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-950 dark:text-white">{toast.title}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{toast.message}</p></div><Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8" aria-label="Dismiss notification" onClick={() => setToasts(items => items.filter(item => item.id !== toast.id))}><X size={15} /></Button></div>)}</div></ToastContext.Provider>
}
export const useToast = () => useContext(ToastContext)
