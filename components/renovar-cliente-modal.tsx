"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, RefreshCw } from "lucide-react"
import type { Cliente } from "@/lib/data"

interface RenovarClienteModalProps {
  isOpen: boolean
  onClose: () => void
  cliente: Cliente | null
  onRenovar: (clienteId: string, fechaInicio: string, fechaFin: string) => void
}

export default function RenovarClienteModal({ isOpen, onClose, cliente, onRenovar }: RenovarClienteModalProps) {
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")

  const handleRenovar = () => {
    if (cliente && fechaInicio && fechaFin) {
      onRenovar(cliente.id, fechaInicio, fechaFin)
      setFechaInicio("")
      setFechaFin("")
      onClose()
    }
  }

  const handleClose = () => {
    setFechaInicio("")
    setFechaFin("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-vtv-green" />
            <span>Renovar Cliente</span>
          </DialogTitle>
          <DialogDescription>
            Actualiza las fechas de actividad para <strong>{cliente?.nombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Período actual:</p>
            <p className="font-medium">
              {cliente?.fechaInicio} - {cliente?.fechaFin}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nueva-fecha-inicio">Nueva Fecha de Inicio</Label>
              <Input
                id="nueva-fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label htmlFor="nueva-fecha-fin">Nueva Fecha de Fin</Label>
              <Input
                id="nueva-fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="mt-1 h-10"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleRenovar}
            disabled={!fechaInicio || !fechaFin}
            className="bg-vtv-green hover:bg-vtv-green/90"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Renovar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
