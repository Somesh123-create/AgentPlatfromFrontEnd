import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <span className="relative inline-flex h-5 w-5 shrink-0"><input ref={ref} type="checkbox" className="peer absolute inset-0 z-10 cursor-pointer opacity-0" {...props} /><span className={cn('flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white text-white transition peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-900', className)}><Check size={13} strokeWidth={3} /></span></span>
))
Checkbox.displayName = 'Checkbox'
