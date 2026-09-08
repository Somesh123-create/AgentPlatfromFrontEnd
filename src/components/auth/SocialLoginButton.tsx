import { Chrome } from 'lucide-react'
import { Button } from '@/components/ui/button'
export function SocialLoginButton({ label = 'Continue with Google' }: { label?: string }) { return <Button type="button" variant="outline" className="w-full" onClick={() => undefined}><Chrome size={17} className="text-blue-500" />{label}</Button> }
