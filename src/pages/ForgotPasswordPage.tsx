import { AuthLayout } from '@/components/auth/AuthLayout'
import { ForgotPasswordForm } from '@/components/auth/AuthFields'
export function ForgotPasswordPage() { return <AuthLayout eyebrow="Account recovery" title="Forgot your password?" description="Enter your email address and we'll send instructions to reset your password."><ForgotPasswordForm /></AuthLayout> }
