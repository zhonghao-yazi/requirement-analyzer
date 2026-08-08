import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe } from '../services/authService'
import { setToken } from '../services/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    getMe()
      .then((result) => setUser(result.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const loginSuccess = useCallback((result) => {
    setToken(result.token)
    setUser(result.user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, loginSuccess, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
