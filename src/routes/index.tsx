import { Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { UpdatePasswordPage } from '@/pages/UpdatePasswordPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { McpServersPage } from '@/pages/McpServersPage'
import { DeploymentsPage } from '@/pages/DeploymentsPage'
import { McpDetailPage } from '@/pages/McpDetailPage'

export function AppRoutes() {
  return <Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route element={<ProtectedRoute />}><Route path="/home" element={<HomePage />} /><Route path="/mcp-servers" element={<McpServersPage />} /><Route path="/mcp-servers/:id" element={<McpDetailPage />} /><Route path="/deployments" element={<DeploymentsPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/update-password" element={<UpdatePasswordPage />} /></Route><Route path="*" element={<LandingPage />} /></Routes>
}
