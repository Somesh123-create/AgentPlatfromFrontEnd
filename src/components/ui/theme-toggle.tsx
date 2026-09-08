import { useEffect, useState } from 'react'
import { Laptop, Moon, Sun } from 'lucide-react'
import { Button } from './button'

type Theme = 'light' | 'dark' | 'system'
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('agenthub-theme') as Theme) || 'system')
  useEffect(() => { const root = document.documentElement; const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches); root.classList.toggle('dark', dark); localStorage.setItem('agenthub-theme', theme) }, [theme])
  const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Laptop
  return <Button variant="ghost" size="icon" aria-label={`Switch theme, currently ${theme}`} title={`Theme: ${theme}`} onClick={() => setTheme(next)}><Icon size={18} /></Button>
}
