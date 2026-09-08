import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }>(({ className, variant = 'primary', size = 'md', ...props }, ref) => (
  <button ref={ref} className={cn('inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', {
    'bg-[#3455db] text-white shadow-[0_10px_24px_rgba(52,85,219,.22)] hover:bg-[#2946c4]': variant === 'primary',
    'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100': variant === 'secondary',
    'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white': variant === 'ghost',
    'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800': variant === 'outline',
    'px-4 py-2 text-sm': size === 'sm',
    'px-5 py-3 text-sm': size === 'md',
    'px-6 py-3.5 text-base': size === 'lg',
    'h-10 w-10': size === 'icon',
  }, className)} {...props} />
))
Button.displayName = 'Button'
