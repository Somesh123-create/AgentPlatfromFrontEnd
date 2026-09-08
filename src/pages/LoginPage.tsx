import { AuthLayout } from '@/components/auth/AuthLayout'
import { LoginForm } from '@/components/auth/AuthFields'
export function LoginPage() { return <AuthLayout eyebrow="Welcome back" title="Sign in to continue." description="Your intelligent workspace is waiting. Pick up where you left off."><LoginForm /></AuthLayout> }
