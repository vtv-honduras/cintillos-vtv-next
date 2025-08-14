"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export interface User {
  username: string
  name: string
  role: "admin" | "master" | "programacion"
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const userSession = localStorage.getItem("user_session")
      if (userSession) {
        try {
          const userData = JSON.parse(userSession)
          setUser(userData)
        } catch (error) {
          localStorage.removeItem("user_session")
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const login = (userData: User) => {
    localStorage.setItem("user_session", JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem("user_session")
    setUser(null)
    router.push("/")
  }

  const hasRole = (requiredRole: string | string[]) => {
    if (!user) return false

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role)
    }

    return user.role === requiredRole
  }

  const hasPermission = (permission: string) => {
    if (!user) return false

    const permissions = {
      admin: ["manage_types", "manage_clients", "manage_channels", "view_all_mentions", "export_data", "manage_users"],
      master: ["create_mentions", "view_own_mentions", "export_own_data"],
      programacion: ["view_all_mentions", "export_data", "filter_mentions"],
    }

    return permissions[user.role]?.includes(permission) || false
  }

  return {
    user,
    loading,
    login,
    logout,
    hasRole,
    hasPermission,
    isAuthenticated: !!user,
  }
}
