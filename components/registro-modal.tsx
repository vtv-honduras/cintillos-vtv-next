"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { Plus, X, Loader2 } from "lucide-react";

import type { Mencion, TipoMencion, Canal, Cliente } from "@/lib/data";
import {
  clientesService,
  canalesService,
  tiposMencionService,
  mencionesService,
} from "@/lib/firebase-services";

interface RegistroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistroExitoso: () => void;
}

type NuevaMencionPayload = {
  cliente: string;
  tipoMencion: string;
  canal: string;
  fecha: string;
  hora: string;
  master: string;
  user_id: string | null;
  fechaCreacion: string;
};

export function RegistroModal({
  isOpen,
  onClose,
  onRegistroExitoso,
}: RegistroModalProps) {
  // datos remotos
  const [tiposMenciones, setTiposMenciones] = useState<TipoMencion[]>([]);
  const [canales, setCanales] = useState<Canal[]>([]);
  const [clientesActivos, setClientesActivos] = useState<Cliente[]>([]);

  // estados de carga
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [loadingCanales, setLoadingCanales] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [saving, setSaving] = useState(false);

  // formulario
  const [formulario, setFormulario] = useState({
    cliente: "",
    tiposSeleccionados: [] as string[],
    canalSeleccionado: "",
    fecha: "",
    hora: new Date().toTimeString().slice(0, 5),
  });

  const [modalConfirmacion, setModalConfirmacion] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: async () => {},
  });

  // Usuario actual desde localStorage (esperamos un JSON con { uid, name, ... })
  const getUsuarioActual = () => {
    if (typeof window === "undefined")
      return { name: "Usuario", uid: null as string | null };
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return { name: "Usuario", uid: null as string | null };
      const parsed = JSON.parse(raw);
      // soporta posibles claves: name/nombre, uid/id
      const name = parsed?.name ?? parsed?.nombre ?? "Usuario";
      const uid = parsed?.uid ?? parsed?.id ?? null;
      return { name, uid };
    } catch {
      return { name: "Usuario", uid: null as string | null };
    }
  };

  // helpers
  const esClienteActivo = (c: Cliente) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(c.fechaFin);
    fin.setHours(0, 0, 0, 0);
    return fin >= hoy;
  };

  // cargar datos solo cuando abre el modal
useEffect(() => {
  if (!isOpen) return;

  // setear fecha y hora actuales al abrir modal

  setFormulario((f) => ({
    ...f,
    fecha: "",
    hora: "",
  }));

  const load = async () => {
    try {
      setLoadingTipos(true);
      setLoadingCanales(true);
      setLoadingClientes(true);
      const [tiposData, canalesData, clientesData] = await Promise.all([
        tiposMencionService.getAll(),
        canalesService.getAll(),
        clientesService.getAll(),
      ]);
      setTiposMenciones(tiposData);
      setCanales(canalesData);
      setClientesActivos(clientesData.filter(esClienteActivo));
    } catch (e) {
      console.error("Error cargando datos para el modal:", e);
    } finally {
      setLoadingTipos(false);
      setLoadingCanales(false);
      setLoadingClientes(false);
    }
  };
  load();
}, [isOpen]);


  // UI handlers
  const toggleTipo = (tipoNombre: string) => {
    setFormulario((f) => {
      const yaEsta = f.tiposSeleccionados.includes(tipoNombre);
      return {
        ...f,
        tiposSeleccionados: yaEsta
          ? f.tiposSeleccionados.filter((t) => t !== tipoNombre)
          : [...f.tiposSeleccionados, tipoNombre],
      };
    });
  };

  const seleccionarCanal = (canalNombre: string) => {
    setFormulario((f) => ({ ...f, canalSeleccionado: canalNombre }));
  };

  const mostrarConfirmacion = (
    title: string,
    description: string,
    onConfirm: () => Promise<void>
  ) => {
    setModalConfirmacion({ isOpen: true, title, description, onConfirm });
  };

  const cerrarModalConfirmacion = () => {
    setModalConfirmacion((m) => ({ ...m, isOpen: false }));
  };

  const limpiarFormulario = () => {
    setFormulario({
      cliente: "",
      tiposSeleccionados: [],
      canalSeleccionado: "",
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toTimeString().slice(0, 5),
    });
  };

  const handleClose = () => {
    limpiarFormulario();
    onClose();
  };

  // registro
  const registrarMencion = () => {
    if (
      !formulario.cliente.trim() ||
      formulario.tiposSeleccionados.length === 0 ||
      !formulario.canalSeleccionado
    ) {
      return;
    }

    const tiposConcatenados = formulario.tiposSeleccionados.join(" + ");
    const descripcion = `Cliente: ${formulario.cliente}, Tipos: ${tiposConcatenados}, Canal: ${formulario.canalSeleccionado}`;

    mostrarConfirmacion(
      "Confirmar registro de mención",
      `${descripcion}. Una vez registrado no podrás modificarlo.`,
      async () => {
        try {
          setSaving(true);
          const { name, uid } = getUsuarioActual();

          const payload: NuevaMencionPayload = {
            cliente: formulario.cliente,
            tipoMencion: tiposConcatenados,
            canal: formulario.canalSeleccionado,
            fecha: formulario.fecha,
            hora: formulario.hora,
            master: name, // 👈 nombre visible del registrante
            user_id: uid, // 👈 uid del usuario
            fechaCreacion: new Date().toISOString(),
          };

          await mencionesService.create(
            payload as unknown as Omit<Mencion, "id">
          );
          limpiarFormulario();
          onRegistroExitoso();
          onClose();
        } catch (e) {
          console.error("Error registrando mención:", e);
          alert("Error al registrar la mención");
        } finally {
          setSaving(false);
          cerrarModalConfirmacion();
        }
      }
    );
  };

  const disabledSubmit =
    saving ||
    loadingTipos ||
    loadingCanales ||
    loadingClientes ||
    !formulario.cliente.trim() ||
    formulario.tiposSeleccionados.length === 0 ||
    !formulario.canalSeleccionado||
    formulario.fecha.trim() === "" ||
    formulario.hora.trim() === "";

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
            {/* Cliente (solo activos) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Cliente * (solo activos)
              </Label>
              <Select
                value={formulario.cliente}
                onValueChange={(v) =>
                  setFormulario((f) => ({ ...f, cliente: v }))
                }
                disabled={loadingClientes}
              >
                <SelectTrigger className="h-11">
                  <SelectValue
                    placeholder={
                      loadingClientes ? "Cargando..." : "Selecciona un cliente"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clientesActivos.map((c) => (
                    <SelectItem key={c.id} value={c.nombre}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                  {clientesActivos.length === 0 && !loadingClientes && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No hay clientes activos
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Tipos (multiselección) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Tipos de Mención * (selecciona uno o más)
              </Label>
              <Select
                onValueChange={(value) => toggleTipo(value)}
                disabled={loadingTipos}
              >
                <SelectTrigger className="h-11">
                  <SelectValue
                    placeholder={
                      loadingTipos
                        ? "Cargando..."
                        : "Selecciona tipos de mención..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {tiposMenciones.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.nombre}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                  {tiposMenciones.length === 0 && !loadingTipos && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No hay tipos registrados
                    </div>
                  )}
                </SelectContent>
              </Select>

              {formulario.tiposSeleccionados.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formulario.tiposSeleccionados.map((tipo) => (
                    <Badge
                      key={tipo}
                      variant="secondary"
                      className="flex items-center gap-1 text-xs"
                    >
                      <span className="truncate max-w-24" title={tipo}>
                        {tipo}
                      </span>
                      <X
                        className="h-3 w-3 cursor-pointer shrink-0"
                        onClick={() => toggleTipo(tipo)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Canales (badges) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Canal *</Label>
              <div className="flex flex-wrap gap-2">
                {loadingCanales ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando
                    canales...
                  </div>
                ) : canales.length > 0 ? (
                  canales.map((canal) => (
                    <Badge
                      key={canal.id}
                      variant={
                        formulario.canalSeleccionado === canal.nombre
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                      onClick={() => seleccionarCanal(canal.nombre)}
                    >
                      {canal.nombre}
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">
                    No hay canales registrados
                  </div>
                )}
              </div>
            </div>

            {/* Fecha y hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha" className="text-sm font-medium">
                  Fecha *
                </Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formulario.fecha}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, fecha: e.target.value }))
                  }
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora" className="text-sm font-medium">
                  Hora *
                </Label>
                <Input
                  id="hora"
                  type="time"
                  value={formulario.hora}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, hora: e.target.value }))
                  }
                  className="h-11 w-full"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={registrarMencion}
                disabled={disabledSubmit}
                className="flex-1 h-11 text-sm"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Registrar Mención
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="h-11 bg-transparent text-sm sm:w-auto"
              >
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
  );
}
