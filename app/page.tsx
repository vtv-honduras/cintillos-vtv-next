"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"

import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Redirigir según el rol
      switch (user.role) {
        case "admin":
          router.push("/admin")
          break
        case "master":
          router.push("/master")
          break
        case "programacion":
          router.push("/programacion")
          break
      }
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      if (!firebaseUser.emailVerified) {
        setError("Por favor verifica tu correo electrónico antes de iniciar sesión")
        setLoading(false)
        return
      }

      // Obtener claims personalizados
      const idTokenResult = await firebaseUser.getIdTokenResult()
      const role = idTokenResult.claims.role || "master"

      // Crear objeto de usuario
      const userData = {
        username: firebaseUser.email || "",
        name: firebaseUser.displayName || "Usuario",
        role: role as "admin" | "master" | "programacion",
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
      }

      // Guardar en localStorage para compatibilidad
      localStorage.setItem("user", JSON.stringify(userData))

      // Redirigir según el rol
      switch (role) {
        case "admin":
          router.push("/admin")
          break
        case "master":
          router.push("/master")
          break
        case "programacion":
          router.push("/programacion")
          break
        default:
          setError("Rol de usuario no válido")
      }
    } catch (error: any) {
      console.error("Error en login:", error)
      if (error.code === "auth/invalid-credential") {
        setError("Credenciales incorrectas")
      } else if (error.code === "auth/user-not-found") {
        setError("Usuario no encontrado")
      } else if (error.code === "auth/invalid-email") {
        setError("Correo electrónico no válido")
      } else {
        setError("Error al iniciar sesión")
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Image src="/vtv-logo.png" alt="VTV Logo" width={80} height={80} className="object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-vtv-blue">Control de Menciones</CardTitle>
          <CardDescription className="text-gray-600">VTV Honduras - Sistema de Gestión</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Ingresa tu correo"
                className="border-gray-200 focus:border-vtv-blue focus:ring-vtv-blue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Ingresa tu contraseña"
                  className="border-gray-200 focus:border-vtv-blue focus:ring-vtv-blue"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && <div className="text-vtv-red text-sm text-center font-medium">{error}</div>}

            <Button type="submit" className="w-full bg-vtv-blue hover:bg-vtv-blue/90 text-white" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}