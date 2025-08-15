"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"

// ✅ servicios centralizados
import {
  login as loginService,
  checkActiveSession,
  logout as logoutService,
  forgotPassword as forgotPasswordService,
} from "@/lib/auth.services"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")          // mensajes informativos (éxito)
  const [resetLoading, setResetLoading] = useState(false) // estado para “olvidé mi contraseña”
  const router = useRouter()
  const { user } = useAuth()

  // Si ya hay sesión activa desde el hook, redirige por rol
  useEffect(() => {
    if (!user) return
    const role = (user as any)?.role || (user as any)?.rol || "master"
    switch (role) {
      case "admin":
        router.push("/admin"); break
      case "master":
        router.push("/master"); break
      case "programacion":
        router.push("/programacion"); break
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setInfo("")

    try {
      // 1) login con servicio
      const { authenticated, firstInit } = await loginService(email, password)

      if (!authenticated) {
        if (firstInit) {
          setError("Te enviamos un correo para verificar tu cuenta. Revisa tu bandeja e intenta nuevamente.")
        } else {
          setError("No se pudo iniciar sesión. Verifica tus credenciales.")
        }
        setLoading(false)
        return
      }

      // 2) claims + sesión
      const sesion = await checkActiveSession()
      if (!sesion.authenticated) {
        setError("No hay sesión activa luego del inicio de sesión.")
        setLoading(false)
        return
      }

      // 3) normalizar y guardar user
      const rolFromClaims = sesion.rol?.rol || "master"
      const userData = {
        username: sesion.email || "",
        name: sesion.nombre || "Usuario",
        role: rolFromClaims as "admin" | "master" | "programacion",
        uid: sesion.uid || "",
        email: sesion.email || "",
        rol_id: sesion.rol?.rol_id ?? null,
      }
      localStorage.setItem("user", JSON.stringify(userData))

      // 4) redirect por rol
      switch (userData.role) {
        case "admin": router.push("/admin"); break
        case "master": router.push("/master"); break
        case "programacion": router.push("/programacion"); break
        default:
          setError("Rol de usuario no válido")
          await logoutService()
      }
    } catch (err) {
      console.error("Error en login:", err)
      setError("Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError("")
    setInfo("")

    if (!email) {
      setError("Ingresa tu correo para enviar el enlace de recuperación.")
      return
    }

    try {
      setResetLoading(true)
      await forgotPasswordService(email)
      setInfo("Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.")
    } catch (err) {
      console.error("Error al enviar recuperación:", err)
      setError("No se pudo enviar el correo de recuperación.")
    } finally {
      setResetLoading(false)
    }
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

            {/* Mensajes */}
            {error && <div className="text-vtv-red text-sm text-center font-medium">{error}</div>}
            {info && !error && <div className="text-green-600 text-sm text-center font-medium">{info}</div>}

            <div className="flex items-center justify-between">
              <Button type="submit" className="bg-vtv-blue hover:bg-vtv-blue/90 text-white" disabled={loading}>
                {loading ?  <Loader2 className="h-6 w-6 animate-spin" />: "Iniciar Sesión"}
              </Button>

              <Button
                type="button"
                variant="link"
                className="text-vtv-blue px-0"
                onClick={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ?  <Loader2 className="h-6 w-6 animate-spin" /> : "¿Olvidaste tu contraseña?"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
