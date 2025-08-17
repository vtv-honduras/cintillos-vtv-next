
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AlertTriangle } from "lucide-react"

export default function UnauthorizedPage() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleGoBack = () => {
    router.push("/")
  }
   

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Acceso Denegado</CardTitle>
          <CardDescription>No tienes permisos para acceder a esta página</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600">
            {user ? (
              <p>
                Tu rol actual es: <strong>{user.role}</strong>
                <br />
                Esta página requiere permisos adicionales.
              </p>
            ) : (
              <p>Necesitas iniciar sesión para acceder a esta página.</p>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            <Button onClick={handleGoBack} className="w-full">
              {user ? "Volver a mi panel" : "Ir al login"}
            </Button>

            {user && (
              <Button variant="outline" onClick={logout} className="w-full bg-transparent">
                Cerrar sesión
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}