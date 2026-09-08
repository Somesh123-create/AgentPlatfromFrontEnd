import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, login, type User } from '@/lib/api'

type AuthContextValue = { token: string | null; user: User | null; loading: boolean; signIn: (email: string, password: string) => Promise<void>; signOut: () => void; refreshUser: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate(); const [token, setToken] = useState<string | null>(() => localStorage.getItem('agenthub_access_token')); const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true)
  const signOut = () => { localStorage.removeItem('agenthub_access_token'); setToken(null); setUser(null); navigate('/') }
  const refreshUser = async () => { if (!token) return; try { setUser(await getCurrentUser(token)) } catch { signOut() } }
  useEffect(() => { let active = true; if (!token) { setLoading(false); return undefined } getCurrentUser(token).then(currentUser => { if (active) setUser(currentUser) }).catch(() => { if (active) signOut() }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [token])
  const signIn = async (email: string, password: string) => { const authToken = await login(email, password); localStorage.setItem('agenthub_access_token', authToken.access_token); setToken(authToken.access_token); setUser(await getCurrentUser(authToken.access_token)) }
  const value = useMemo(() => ({ token, user, loading, signIn, signOut, refreshUser }), [token, user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context }