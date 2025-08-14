"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { Plus, Calendar, Clock, X } from "lucide-react"
import {
  getStoredData,
  setStoredData,
  generateId,
  getClientesActivos,
  TIPOS_MENCIONES_INICIALES,
  CANALES_INICIALES,
  CLIENTES_INICIALES,
  type Mencion,
  type TipoMencion,
  type Canal,
  type Cliente,
} from "@/lib/data"

interface RegistroModalProps {
  isOpen: boolean
  onClose: () => void
  onRegistroExitoso: () => void
}

export function RegistroModal({ isOpen, onClose, onRegistroExitoso }: RegistroModalProps) {
  const [tiposMenciones, setTiposMenciones] = useState<TipoMencion[]>([])
  const [canales, setCanales] = useState<Canal[]>([])
  const [clientesActivos, setClientesActivos] = useState<string[]>([])
  const [clientesFiltrados, setClientesFiltrados] = useState<string[]>([])

  const [formulario, setFormulario] = useState({
    cliente: "",
    tiposSeleccionados: [] as string[],
    canalSeleccionado: "",
    fecha: new Date().toISOString().split("T")[0],
    hora: new Date().toTimeString().slice(0, 5),
  })

  const [modalConfirmacion, setModalConfirmacion] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  })

  const usuario = typeof window !== "undefined" ? localStorage.getItem("user") || "Usuario" : "Usuario"

  useEffect(() => {
    if (isOpen) {
      setTiposMenciones(getStoredData("tipos_menciones", TIPOS_MENCIONES_INICIALES))
      setCanales(getStoredData("canales", CANALES_INICIALES))

      // Obtener solo clientes activos
      const todosClientes = getStoredData<Cliente[]>("clientes", CLIENTES_INICIALES)
      const activos = getClientesActivos(todosClientes)
      const nombresActivos = activos.map((c) => c.nombre)
      setClientesActivos(nombresActivos)
      setClientesFiltrados(nombresActivos)
    }
  }, [isOpen])

  const filtrarClientes = (busqueda: string) => {
    if (!busqueda.trim()) {
      setClientesFiltrados(clientesActivos)
      return
    }
    const filtrados = clientesActivos.filter((cliente) => cliente.toLowerCase().includes(busqueda.toLowerCase()))
    setClientesFiltrados(filtrados)
  }

  const seleccionarCliente = (cliente: string) => {
    setFormulario({ ...formulario, cliente })
    setClientesFiltrados([])
  }

  const toggleTipo = (tipoNombre: string) => {
    const nuevosSeleccionados = formulario.tiposSeleccionados.includes(tipoNombre)
      ? formulario.tiposSeleccionados.filter((t) => t !== tipoNombre)
      : [...formulario.tiposSeleccionados, tipoNombre]

    setFormulario({ ...formulario, tiposSeleccionados: nuevosSeleccionados })
  }

  const seleccionarCanal = (canalNombre: string) => {
    setFormulario({ ...formulario, canalSeleccionado: canalNombre })
  }

  const mostrarConfirmacion = (title: string, description: string, onConfirm: () => void) => {
    setModalConfirmacion({
      isOpen: true,
      title,
      description,
      onConfirm,
    })
  }

  const cerrarModalConfirmacion = () => {
    setModalConfirmacion({ ...modalConfirmacion, isOpen: false })
  }

  const registrarMencion = () => {
    if (!formulario.cliente.trim() || formulario.tiposSeleccionados.length === 0 || !formulario.canalSeleccionado) {
      return
    }

    const tiposConcatenados = formulario.tiposSeleccionados.join(" + ")
    const descripcion = `Cliente: ${formulario.cliente}, Tipos: ${tiposConcatenados}, Canal: ${formulario.canalSeleccionado}`

    mostrarConfirmacion(
      "Confirmar registro de mención",
      `${descripcion}. Una vez registrado no podrás modificarlo.`,
      () => {
        const nuevaMencion: Mencion = {
          id: generateId(),
          cliente: formulario.cliente,
          tipoMencion: tiposConcatenados,
          canal: formulario.canalSeleccionado,
          fecha: formulario.fecha,
          hora: formulario.hora,
          usuario: usuario,
          fechaCreacion: new Date().toISOString(),
        }

        const menciones = getStoredData<Mencion[]>("menciones", [])
        const nuevasMenciones = [...menciones, nuevaMencion]
        setStoredData("menciones", nuevasMenciones)

        // Limpiar formulario
        setFormulario({
          cliente: "",
          tiposSeleccionados: [],
          canalSeleccionado: "",
          fecha: new Date().toISOString().split("T")[0],
          hora: new Date().toTimeString().slice(0, 5),
        })

        onRegistroExitoso()
        onClose()
      },
    )
  }

  const limpiarFormulario = () => {
    setFormulario({
      cliente: "",
      tiposSeleccionados: [],
      canalSeleccionado: "",
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toTimeString().slice(0, 5),
    })
  }

  const handleClose = () => {
    limpiarFormulario()
    onClose()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[90vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5" />
              Registrar Nueva Mención
            </DialogTitle>
            <DialogDescription className="text-sm">
              Completa todos los campos para registrar una nueva mención
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Cliente con autocompletado */}
            <div className="space-y-2">
              <Label htmlFor="cliente" className="text-sm font-medium">
                Cliente * (Solo clientes activos)
              </Label>
              <div className="relative">
                <Input
                  id="cliente"
                  value={formulario.cliente}
                  onChange={(e) => {
                    setFormulario({ ...formulario, cliente: e.target.value })
                    filtrarClientes(e.target.value)
                  }}
                  placeholder="Nombre del cliente..."
                  className="h-11 text-base"
                />
                {clientesFiltrados.length > 0 && formulario.cliente && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {clientesFiltrados.map((cliente, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 text-sm break-words"
                        onClick={() => seleccionarCliente(cliente)}
                      >
                        {cliente}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selección múltiple de tipos */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipos de Mención * (selecciona uno o más)</Label>
              <Select onValueChange={(value) => toggleTipo(value)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona tipos de mención..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposMenciones.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.nombre}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formulario.tiposSeleccionados.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formulario.tiposSeleccionados.map((tipo) => (
                    <Badge key={tipo} variant="secondary" className="flex items-center gap-1 text-xs">
                      <span className="truncate max-w-24" title={tipo}>
                        {tipo}
                      </span>
                      <X className="h-3 w-3 cursor-pointer shrink-0" onClick={() => toggleTipo(tipo)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Selección de canal con badges */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Canal *</Label>
              <div className="flex flex-wrap gap-2">
                {canales.map((canal) => (
                  <Badge
                    key={canal.id}
                    variant={formulario.canalSeleccionado === canal.nombre ? "default" : "outline"}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                    onClick={() => seleccionarCanal(canal.nombre)}
                  >
                    {canal.nombre}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Fecha y hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha" className="text-sm font-medium">
                  Fecha *
                </Label>
                <div className="relative">
                  <Input
                    id="fecha"
                    type="date"
                    value={formulario.fecha}
                    onChange={(e) => setFormulario({ ...formulario, fecha: e.target.value })}
                    className="h-11 text-base"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora" className="text-sm font-medium">
                  Hora *
                </Label>
                <div className="relative">
                  <Input
                    id="hora"
                    type="time"
                    value={formulario.hora}
                    onChange={(e) => setFormulario({ ...formulario, hora: e.target.value })}
                    className="h-11 text-base"
                  />
                  <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={registrarMencion}
                disabled={
                  !formulario.cliente.trim() ||
                  formulario.tiposSeleccionados.length === 0 ||
                  !formulario.canalSeleccionado
                }
                className="flex-1 h-11 text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar Mención
              </Button>
              <Button variant="outline" onClick={handleClose} className="h-11 bg-transparent text-sm sm:w-auto">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={modalConfirmacion.isOpen}
        onClose={cerrarModalConfirmacion}
        onConfirm={modalConfirmacion.onConfirm}
        title={modalConfirmacion.title}
        description={modalConfirmacion.description}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />
    </>
  )
}
