"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, signOut, getIdTokenResult } from "firebase/auth"
import { auth } from "@/lib/firebase"

export interface User {
  username: string
  name: string
  role: "admin" | "master" | "programacion"
  uid?: string
  email?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const idTokenResult = await getIdTokenResult(firebaseUser)

            const userData: User = {
              username: firebaseUser.email || "",
              name: firebaseUser.displayName || "Usuario",
              role: (idTokenResult.claims.role as "admin" | "master" | "programacion") || "master",
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
            }
            setUser(userData)

            // Mantener compatibilidad con localStorage
            localStorage.setItem("user", JSON.stringify(userData))
          } else {
            // Fallback a localStorage para compatibilidad
            const userSession = localStorage.getItem("user")
            if (userSession) {
              try {
                const userData = JSON.parse(userSession)
                setUser(userData)
              } catch (error) {
                localStorage.removeItem("user")
                setUser(null)
              }
            } else {
              setUser(null)
            }
          }
          setLoading(false)
        })

        return unsubscribe
      } catch (error) {
        console.error("Error checking auth:", error)
        // Fallback a localStorage
        const userSession = localStorage.getItem("user")
        if (userSession) {
          try {
            const userData = JSON.parse(userSession)
            setUser(userData)
          } catch (error) {
            localStorage.removeItem("user")
          }
        }
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = (userData: User) => {
    localStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error logging out:", error)
    }

    localStorage.removeItem("user")
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
      programacion: ["view_all_mentions", "export_data", "filter_mentions", "manage_clients", "manage_types"],
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
