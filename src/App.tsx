import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/auth/AuthProvider'
import { AppRoutes } from '@/routes'

export default function App() {
  return <ToastProvider><AuthProvider><AppRoutes /></AuthProvider></ToastProvider>
}
