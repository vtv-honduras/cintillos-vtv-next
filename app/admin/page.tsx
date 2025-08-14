"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Users, Radio } from "lucide-react"
import { RouteGuard } from "@/components/route-guard"
import { Navbar } from "@/components/navbar"
import ConfirmationModal from "@/components/confirmation-modal"
import { type Canal, type Usuario, getRoleColor, getRoleName } from "@/lib/data"
import { canalesService, inicializarDatosPorDefecto } from "@/lib/firebase-services"

export default function AdminPage() {
  const [canales, setCanales] = useState<Canal[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [nuevoCanal, setNuevoCanal] = useState("")
  const [nuevoUsuario, setNuevoUsuario] = useState({
    username: "",
    password: "",
    role: "master" as const,
    name: "",
    email: "",
  })
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<() => void>(() => {})
  const [confirmMessage, setConfirmMessage] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      // Inicializar datos por defecto y cargar desde Firebase
      await inicializarDatosPorDefecto()
      const canalesData = await canalesService.getAll()
      setCanales(canalesData)

      // Cargar usuarios desde API
      await cargarUsuarios()
    } catch (error) {
      console.error("Error cargando datos:", error)
      // Fallback a localStorage si Firebase falla
      const canalesLS = localStorage.getItem("canales")
      if (canalesLS) setCanales(JSON.parse(canalesLS))
    } finally {
      setLoading(false)
    }
  }

  const cargarUsuarios = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const usuariosAPI = await response.json()
        setUsuarios(usuariosAPI)
        // También guardar en localStorage como respaldo
        localStorage.setItem("usuarios", JSON.stringify(usuariosAPI))
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error)
      // Fallback a localStorage
      const usuariosGuardados = localStorage.getItem("usuarios")
      if (usuariosGuardados) {
        setUsuarios(JSON.parse(usuariosGuardados))
      }
    }
  }

  const confirmarAccion = (mensaje: string, accion: () => void) => {
    setConfirmMessage(mensaje)
    setPendingAction(() => accion)
    setShowConfirmModal(true)
  }

  const ejecutarAccion = () => {
    pendingAction()
    setShowConfirmModal(false)
  }

  const agregarCanal = async () => {
    if (nuevoCanal.trim()) {
      try {
        // Crear en Firebase en lugar de localStorage
        await canalesService.create({
          nombre: nuevoCanal.trim(),
        })

        setNuevoCanal("")
        await cargarDatos() // Recargar datos
      } catch (error) {
        console.error("Error agregando canal:", error)
        alert("Error al agregar canal")
      }
    }
  }

  const eliminarCanal = async (id: string) => {
    try {
      // Eliminar de Firebase en lugar de localStorage
      await canalesService.delete(id)
      await cargarDatos() // Recargar datos
    } catch (error) {
      console.error("Error eliminando canal:", error)
      alert("Error al eliminar canal")
    }
  }

  const agregarUsuario = async () => {
    if (nuevoUsuario.name.trim() && nuevoUsuario.password.trim()) {
      try {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nuevoUsuario),
        })

        if (response.ok) {
          await cargarUsuarios() // Recargar usuarios desde API
          setNuevoUsuario({
            name: "",
            password: "",
            role: "master",
            email: "",
          })
        } else {
          const error = await response.json()
          alert(`Error: ${error.error}`)
        }
      } catch (error) {
        console.error("Error creando usuario:", error)
        alert("Error al crear usuario")
      }
    }
  }

  const toggleUsuarioActivo = async (id: string) => {
    const usuario = usuarios.find((u) => u.id === id)
    if (!usuario) return

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, activo: !usuario.activo }),
      })

      if (response.ok) {
        await cargarUsuarios()
      }
    } catch (error) {
      console.error("Error actualizando usuario:", error)
    }
  }

  const eliminarUsuario = async (id: string) => {
    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await cargarUsuarios()
      }
    } catch (error) {
      console.error("Error eliminando usuario:", error)
    }
  }

  return (
    <RouteGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 pt-16">
        <Navbar title="Panel de Administrador" />
        <div className="container mx-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Cargando datos...</div>
          ) : (
            <>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-vtv-red/10 rounded-lg">
                  <Users className="h-6 w-6 text-vtv-red" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Panel de Administrador</h1>
                  <p className="text-gray-600 text-sm sm:text-base">Gestión de canales y usuarios del sistema</p>
                </div>
              </div>

              <Tabs defaultValue="canales" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="canales" className="flex items-center space-x-2 text-sm">
                    <Radio className="h-4 w-4" />
                    <span>Canales</span>
                  </TabsTrigger>
                  <TabsTrigger value="usuarios" className="flex items-center space-x-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>Usuarios</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="canales">
                  <div className="grid gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Radio className="h-5 w-5 text-vtv-blue" />
                          <span>Agregar Nuevo Canal</span>
                        </CardTitle>
                        <CardDescription className="text-sm">Registra un nuevo canal de televisión</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                          <div className="flex-1">
                            <Label htmlFor="canal" className="text-sm">
                              Nombre del Canal
                            </Label>
                            <Input
                              id="canal"
                              value={nuevoCanal}
                              onChange={(e) => setNuevoCanal(e.target.value)}
                              placeholder="Ej: VTV, VTV Plus, ANTV"
                              className="mt-1"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              onClick={() =>
                                confirmarAccion(
                                  `¿Estás seguro de agregar el canal "${nuevoCanal}"? No podrás modificarlo después.`,
                                  agregarCanal,
                                )
                              }
                              disabled={!nuevoCanal.trim()}
                              className="bg-vtv-blue hover:bg-vtv-blue/90 w-full sm:w-auto"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Canales Registrados</CardTitle>
                        <CardDescription className="text-sm">
                          Lista de todos los canales disponibles ({canales.length} total)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3">
                          {canales.map((canal) => (
                            <div key={canal.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <div className="w-2 h-2 bg-vtv-blue rounded-full shrink-0"></div>
                                <span className="font-medium truncate" title={canal.nombre}>
                                  {canal.nombre}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  confirmarAccion(`¿Estás seguro de eliminar el canal "${canal.nombre}"?`, () =>
                                    eliminarCanal(canal.id),
                                  )
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {canales.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-sm">No hay canales registrados</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="usuarios">
                  <div className="grid gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Users className="h-5 w-5 text-vtv-green" />
                          <span>Crear Nuevo Usuario</span>
                        </CardTitle>
                        <CardDescription className="text-sm">Registra un nuevo usuario del sistema</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name" className="text-sm">
                              Nombre Completo
                            </Label>
                            <Input
                              id="name"
                              value={nuevoUsuario.name}
                              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, name: e.target.value })}
                              placeholder="Juan Pérez"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="email" className="text-sm">
                              Email
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              value={nuevoUsuario.email}
                              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                              placeholder="usuario@vtv.gob.hn"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="role" className="text-sm">
                              Rol
                            </Label>
                            <Select
                              value={nuevoUsuario.role}
                              onValueChange={(value: any) => setNuevoUsuario({ ...nuevoUsuario, role: value })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="master">Master</SelectItem>
                                <SelectItem value="programacion">Programación</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="password" className="text-sm">
                              Contraseña
                            </Label>
                            <Input
                              id="password"
                              type="password"
                              value={nuevoUsuario.password}
                              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                              placeholder="contraseña123"
                              className="mt-1"
                            />
                          </div>

                          <div className="flex items-end">
                            <Button
                              onClick={() =>
                                confirmarAccion(
                                  `¿Crear usuario "${nuevoUsuario.name}" con rol ${getRoleName(nuevoUsuario.role)}?`,
                                  agregarUsuario,
                                )
                              }
                              disabled={!nuevoUsuario.password.trim() || !nuevoUsuario.name.trim()}
                              className="w-full bg-vtv-green hover:bg-vtv-green/90"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Crear Usuario
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Usuarios del Sistema</CardTitle>
                        <CardDescription className="text-sm">
                          Gestión de usuarios registrados ({usuarios.length} total)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Vista desktop */}
                        <div className="hidden md:block">
                          <div className="grid gap-3">
                            {usuarios.map((usuario) => (
                              <div key={usuario.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center space-x-4 min-w-0 flex-1">
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="font-medium truncate" title={usuario.name}>
                                        {usuario.name}
                                      </span>
                                      <Badge className={`${getRoleColor(usuario.role)} text-xs shrink-0`}>
                                        {getRoleName(usuario.role)}
                                      </Badge>
                                      <Badge
                                        variant={usuario.activo ? "default" : "secondary"}
                                        className="text-xs shrink-0"
                                      >
                                        {usuario.activo ? "Activo" : "Inactivo"}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-gray-500 truncate">{usuario.email}</div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleUsuarioActivo(usuario.id)}
                                    className={`text-xs ${
                                      usuario.activo
                                        ? "text-orange-600 hover:bg-orange-50"
                                        : "text-green-600 hover:bg-green-50"
                                    }`}
                                  >
                                    {usuario.activo ? "Desactivar" : "Activar"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      confirmarAccion(`¿Estás seguro de eliminar al usuario "${usuario.name}"?`, () =>
                                        eliminarUsuario(usuario.id),
                                      )
                                    }
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Vista móvil - Cards */}
                        <div className="md:hidden">
                          <div className="grid gap-4">
                            {usuarios.map((usuario) => (
                              <Card key={usuario.id}>
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div className="min-w-0 flex-1 pr-2">
                                        <h3 className="font-medium truncate" title={usuario.name}>
                                          {usuario.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 truncate" title={usuario.email}>
                                          {usuario.email}
                                        </p>
                                      </div>
                                      <div className="flex flex-col space-y-1 shrink-0">
                                        <Badge className={`${getRoleColor(usuario.role)} text-xs`}>
                                          {getRoleName(usuario.role)}
                                        </Badge>
                                        <Badge variant={usuario.activo ? "default" : "secondary"} className="text-xs">
                                          {usuario.activo ? "Activo" : "Inactivo"}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleUsuarioActivo(usuario.id)}
                                        className={`flex-1 text-xs ${
                                          usuario.activo
                                            ? "text-orange-600 hover:bg-orange-50"
                                            : "text-green-600 hover:bg-green-50"
                                        }`}
                                      >
                                        {usuario.activo ? "Desactivar" : "Activar"}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          confirmarAccion(
                                            `¿Estás seguro de eliminar al usuario "${usuario.name}"?`,
                                            () => eliminarUsuario(usuario.id),
                                          )
                                        }
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {usuarios.length === 0 && (
                          <div className="text-center py-8 text-gray-500 text-sm">No hay usuarios registrados</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>

              <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={ejecutarAccion}
                title="Confirmar Acción"
                message={confirmMessage}
              />
            </>
          )}
        </div>
      </div>
    </RouteGuard>
  )
}
