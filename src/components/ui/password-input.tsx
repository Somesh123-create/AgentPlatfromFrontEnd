import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './input'
import { Button } from './button'

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  return <div className="relative"><Input {...props} type={visible ? 'text' : 'password'} className="pr-12" /><Button type="button" variant="ghost" size="icon" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(value => !value)} className="absolute right-1 top-1 h-10 w-10">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</Button></div>
}
