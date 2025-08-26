"use client";

import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RouteGuard } from "@/components/route-guard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmationModal from "@/components/confirmation-modal";
import RenovarClienteModal from "@/components/renovar-cliente-modal";
import { RegistroModal } from "@/components/registro-modal";
import {
  Plus,
  FileText,
  Calendar,
  Clock,
  Filter,
  Loader2,
  Trash2,
  RefreshCw,
  Tag,
  Users,
  PencilLine,
} from "lucide-react";

import type { Mencion, Cliente, TipoMencion } from "@/lib/data";
import {
  mencionesService,
  clientesService,
  tiposMencionService,
} from "@/lib/firebase-services";

// === Helpers de fecha ===
const yyyymmddLocal = (d: Date) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};
const startOfTodayLocal = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfWeekLocal = () => {
  const d = startOfTodayLocal();
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return d;
};
const startOfMonthLocal = () => {
  const d = startOfTodayLocal();
  d.setDate(1);
  return d;
};

// === Helpers de usuario ===
function getUsuarioActual() {
  if (typeof window === "undefined")
    return { uid: null as string | null, name: "Usuario", email: "" };
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return { uid: null as string | null, name: "Usuario", email: "" };
    const parsed = JSON.parse(raw);
    return {
      uid: parsed?.uid ?? parsed?.id ?? null,
      name: parsed?.name ?? parsed?.nombre ?? "Usuario",
      email: parsed?.email ?? parsed?.username ?? "",
    };
  } catch {
    return { uid: null as string | null, name: "Usuario", email: "" };
  }
}

function isMencionDelUsuario(
  m: any,
  user: { uid: string | null; name: string; email: string }
) {
  if (m?.user_id && user.uid) return m.user_id === user.uid;
  if (m?.usuario && typeof m.usuario === "string") {
    const u = m.usuario.toLowerCase();
    return (
      u === (user.name || "").toLowerCase() ||
      u === (user.email || "").toLowerCase()
    );
  }
  return false;
}

// Normaliza para búsquedas: sin acentos, lower, trim
const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

// === Utilidades clientes ===
const esClienteActivo = (cliente: Cliente) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(cliente.fechaFin);
  fin.setHours(0, 0, 0, 0);
  return fin >= hoy;
};

export default function MasterPage() {
  const [menciones, setMenciones] = useState<Mencion[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros de tiempo para historial personal
  const [filtroTiempo, setFiltroTiempo] = useState<
    "todos" | "hoy" | "semana" | "mes" | "personalizado"
  >("hoy");
  const [filtroPersonalizado, setFiltroPersonalizado] = useState({
    fechaInicio: "",
    fechaFin: "",
  });

  // filtro por cliente (texto libre)
  const [filtroCliente, setFiltroCliente] = useState("");

  // modal registro / edición
  const [modalAbierta, setModalAbierta] = useState(false);
  const [mencionAEditar, setMencionAEditar] = useState<Mencion | null>(null);

  // usuario
  const usuario = useMemo(getUsuarioActual, []);
  const hoyStr = yyyymmddLocal(new Date());

  // === Estado y lógica de administración (Clientes & Tipos) ===
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tipos, setTipos] = useState<TipoMencion[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingTipos, setLoadingTipos] = useState(false);

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
  });
  const [nuevoTipo, setNuevoTipo] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});

  const [showRenovarModal, setShowRenovarModal] = useState(false);
  const [clienteARenovar, setClienteARenovar] = useState<Cliente | null>(null);

  const confirmarAccion = (mensaje: string, accion: () => void) => {
    setConfirmMessage(mensaje);
    setPendingAction(() => accion);
    setShowConfirmModal(true);
  };
  const ejecutarAccion = () => {
    pendingAction();
    setShowConfirmModal(false);
  };

  const abrirRenovarModal = (cliente: Cliente) => {
    setClienteARenovar(cliente);
    setShowRenovarModal(true);
  };

  const renovarCliente = async (
    clienteId: string,
    fechaInicio: string,
    fechaFin: string
  ) => {
    try {
      setLoadingClientes(true);
      await clientesService.update(clienteId, { fechaInicio, fechaFin });
      await cargarClientes();
    } catch (error) {
      console.error("Error renovando cliente:", error);
      alert("Error al renovar cliente");
    } finally {
      setLoadingClientes(false);
    }
  };

  const agregarCliente = async () => {
    if (
      nuevoCliente.nombre.trim() &&
      nuevoCliente.fechaInicio &&
      nuevoCliente.fechaFin
    ) {
      try {
        setLoadingClientes(true);
        await clientesService.create({
          nombre: nuevoCliente.nombre.trim(),
          fechaInicio: nuevoCliente.fechaInicio,
          fechaFin: nuevoCliente.fechaFin,
        });
        setNuevoCliente({ nombre: "", fechaInicio: "", fechaFin: "" });
        await cargarClientes();
      } catch (error) {
        console.error("Error agregando cliente:", error);
        alert("Error al agregar cliente");
      } finally {
        setLoadingClientes(false);
      }
    }
  };

  const eliminarCliente = async (id: string) => {
    try {
      setLoadingClientes(true);
      await clientesService.delete(id);
      await cargarClientes();
    } catch (error) {
      console.error("Error eliminando cliente:", error);
      alert("Error al eliminar cliente");
    } finally {
      setLoadingClientes(false);
    }
  };

  const agregarTipo = async () => {
    if (nuevoTipo.trim()) {
      try {
        setLoadingTipos(true);
        await tiposMencionService.create({ nombre: nuevoTipo.trim() });
        setNuevoTipo("");
        await cargarTipos();
      } catch (error) {
        console.error("Error agregando tipo:", error);
        alert("Error al agregar tipo de mención");
      } finally {
        setLoadingTipos(false);
      }
    }
  };

  const eliminarTipo = async (id: string) => {
    try {
      setLoadingTipos(true);
      await tiposMencionService.delete(id);
      await cargarTipos();
    } catch (error) {
      console.error("Error eliminando tipo:", error);
      alert("Error al eliminar tipo de mención");
    } finally {
      setLoadingTipos(false);
    }
  };

  // === Carga ===
  const cargarMenciones = async () => {
    try {
      setLoading(true);
      const todas = await mencionesService.getAll();
      setMenciones(todas);
    } catch (e) {
      console.error("Error cargando menciones:", e);
    } finally {
      setLoading(false);
    }
  };
  const cargarClientes = async () => {
    try {
      setLoadingClientes(true);
      const clientesData = await clientesService.getAll();
      setClientes(clientesData);
    } catch (e) {
      console.error("Error cargando clientes:", e);
    } finally {
      setLoadingClientes(false);
    }
  };
  const cargarTipos = async () => {
    try {
      setLoadingTipos(true);
      const tiposData = await tiposMencionService.getAll();
      setTipos(tiposData);
    } catch (e) {
      console.error("Error cargando tipos:", e);
    } finally {
      setLoadingTipos(false);
    }
  };

  useEffect(() => {
    // Cargar todo de una
    cargarMenciones();
    cargarClientes();
    cargarTipos();
  }, []);

  // === Derivados de menciones ===
  const mencionesDelUsuario = useMemo(
    () => menciones.filter((m) => isMencionDelUsuario(m, usuario)),
    [menciones, usuario]
  );

  // filtro por tiempo + cliente
  const mencionesFiltradas = useMemo(() => {
    const lista = [...mencionesDelUsuario];

    const porTiempo = (() => {
      if (filtroTiempo === "todos") return lista;
      if (filtroTiempo === "hoy") return lista.filter((m: any) => m.fecha === hoyStr);
      if (filtroTiempo === "semana") {
        const inicio = startOfWeekLocal().getTime();
        return lista.filter((m: any) => new Date(m.fecha).getTime() >= inicio);
      }
      if (filtroTiempo === "mes") {
        const inicio = startOfMonthLocal().getTime();
        return lista.filter((m: any) => new Date(m.fecha).getTime() >= inicio);
      }
      if (filtroTiempo === "personalizado") {
        const { fechaInicio, fechaFin } = filtroPersonalizado;
        if (!fechaInicio || !fechaFin) return lista;
        return lista.filter((m: any) => m.fecha >= fechaInicio && m.fecha <= fechaFin);
      }
      return lista;
    })();

    const filtro = normalize(filtroCliente);
    if (!filtro) return porTiempo;

    return porTiempo.filter((m: any) => normalize(m.cliente).includes(filtro));
  }, [mencionesDelUsuario, filtroTiempo, filtroPersonalizado, hoyStr, filtroCliente]);

  const estadisticas = useMemo(() => {
    const total = mencionesDelUsuario.length;
    const hoy = mencionesDelUsuario.filter((m: any) => m.fecha === hoyStr).length;
    const semana = (() => {
      const inicio = startOfWeekLocal().getTime();
      return mencionesDelUsuario.filter((m: any) => new Date(m.fecha).getTime() >= inicio).length;
    })();
    const filtradas = mencionesFiltradas.length;
    return { total, hoy, estaSemana: semana, filtradas };
  }, [mencionesDelUsuario, mencionesFiltradas, hoyStr]);

  // === Abrir modal: crear vs editar ===
  const abrirCrear = () => {
    setMencionAEditar(null);
    setModalAbierta(true);
  };
  const abrirEditar = (m: Mencion) => {
    setMencionAEditar(m);
    setModalAbierta(true);
  };
  const cerrarModal = () => {
    setModalAbierta(false);
    setMencionAEditar(null);
  };

  // === Eliminar mención ===
  const solicitarEliminarMencion = (m: Mencion) => {
    confirmarAccion(
      `¿Eliminar la mención de "${m.cliente}" del ${m.fecha} a las ${m.hora}?`,
      async () => {
        try {
          await mencionesService.delete(m.id);
          await cargarMenciones();
        } catch (e) {
          console.error("Error eliminando mención:", e);
          alert("Error al eliminar la mención");
        }
      }
    );
  };

  return (
    <RouteGuard requiredRole={"master"}>
      <div className="min-h-screen bg-gray-50 pt-16">
        <Navbar title="Registro de Menciones" />

        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Panel Master
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Consulta tu historial, administra clientes y tipos, y registra nuevas menciones
            </p>
          </div>

          {/* Tabs principales */}
          <Tabs defaultValue="historial" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="historial" className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> Historial
              </TabsTrigger>
              <TabsTrigger value="clientes" className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Clientes
              </TabsTrigger>
              <TabsTrigger value="tipos" className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" /> Tipos
              </TabsTrigger>
            </TabsList>

            {/* === TAB: HISTORIAL PERSONAL === */}
            <TabsContent value="historial">
              {loading ? (
                <div className="w-full bg-gray-50 pt-16 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Estadísticas personales */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Total Registradas</p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-600">{estadisticas.total}</p>
                          </div>
                          <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Hoy</p>
                            <p className="text-xl sm:text-2xl font-bold text-green-600">{estadisticas.hoy}</p>
                          </div>
                          <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="sm:col-span-2 lg:col-span-1">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Esta Semana</p>
                            <p className="text-xl sm:text-2xl font-bold text-purple-600">{estadisticas.estaSemana}</p>
                          </div>
                          <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Filtros de tiempo + cliente */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Filter className="h-5 w-5" /> Filtros
                      </CardTitle>
                      <CardDescription>Acota por período y cliente</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="filtro-tiempo">Período</Label>
                          <Select value={filtroTiempo} onValueChange={(v: any) => setFiltroTiempo(v)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos</SelectItem>
                              <SelectItem value="hoy">Hoy</SelectItem>
                              <SelectItem value="semana">Esta Semana</SelectItem>
                              <SelectItem value="mes">Este Mes</SelectItem>
                              <SelectItem value="personalizado">Personalizado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {filtroTiempo === "personalizado" && (
                          <>
                            <div>
                              <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
                              <Input
                                id="fecha-inicio"
                                type="date"
                                value={filtroPersonalizado.fechaInicio}
                                onChange={(e) =>
                                  setFiltroPersonalizado({ ...filtroPersonalizado, fechaInicio: e.target.value })
                                }
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="fecha-fin">Fecha Fin</Label>
                              <Input
                                id="fecha-fin"
                                type="date"
                                value={filtroPersonalizado.fechaFin}
                                onChange={(e) =>
                                  setFiltroPersonalizado({ ...filtroPersonalizado, fechaFin: e.target.value })
                                }
                                className="mt-1"
                              />
                            </div>
                          </>
                        )}

                        {/* Filtro de cliente (texto libre) */}
                        <div>
                          <Label htmlFor="filtro-cliente">Cliente</Label>
                          <Input
                            id="filtro-cliente"
                            type="text"
                            placeholder="Escribe para filtrar por cliente…"
                            value={filtroCliente}
                            onChange={(e) => setFiltroCliente(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {filtroTiempo !== "todos" || filtroCliente.trim() ? (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-700">
                            Mostrando {estadisticas.filtradas} de {estadisticas.total} registros
                          </p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  {/* Historial personal */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5" /> Mi Historial ({mencionesFiltradas.length})
                      </CardTitle>
                      <CardDescription>Menciones registradas por ti</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {mencionesFiltradas.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-base sm:text-lg">
                            {filtroTiempo === "todos" && !filtroCliente.trim()
                              ? "No has registrado menciones aún"
                              : "No hay menciones con los filtros aplicados"}
                          </p>
                          <p className="text-sm">
                            {filtroTiempo === "todos" && !filtroCliente.trim()
                              ? "Usa el botón + para registrar tu primera mención"
                              : "Ajusta los filtros para ver más resultados"}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Escritorio */}
                          <div className="hidden md:block">
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="border-b bg-gray-50">
                                    <th className="text-left p-3 font-medium text-gray-900">Cliente</th>
                                    <th className="text-left p-3 font-medium text-gray-900">Tipo</th>
                                    <th className="text-left p-3 font-medium text-gray-900">Canal</th>
                                    <th className="text-left p-3 font-medium text-gray-900">Fecha</th>
                                    <th className="text-left p-3 font-medium text-gray-900">Hora</th>
                                    <th className="text-right p-3 font-medium text-gray-900">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mencionesFiltradas
                                    .sort(
                                      (a, b) =>
                                        new Date(b.fechaCreacion).getTime() -
                                        new Date(a.fechaCreacion).getTime()
                                    )
                                    .map((mencion: any) => (
                                      <tr key={mencion.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium max-w-xs">
                                          <div className="truncate" title={mencion.cliente}>
                                            {mencion.cliente}
                                          </div>
                                        </td>
                                        <td className="p-3">
                                          <Badge variant="secondary" className="text-xs">
                                            <div title={mencion.tipoMencion}>{mencion.tipoMencion}</div>
                                          </Badge>
                                        </td>
                                        <td className="p-3">
                                          <Badge variant="outline" className="text-xs">{mencion.canal}</Badge>
                                        </td>
                                        <td className="p-3 text-sm">{mencion.fecha}</td>
                                        <td className="p-3 text-sm">{mencion.hora}</td>
                                        <td className="p-3 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => abrirEditar(mencion)}>
                                              <PencilLine className="h-4 w-4 mr-1" />
                                              Editar
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                              onClick={() => solicitarEliminarMencion(mencion)}
                                            >
                                              <Trash2 className="h-4 w-4 mr-1" />
                                              Eliminar
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Móvil */}
                          <div className="md:hidden space-y-3">
                            {mencionesFiltradas
                              .sort(
                                (a, b) =>
                                  new Date(b.fechaCreacion).getTime() -
                                  new Date(a.fechaCreacion).getTime()
                              )
                              .map((mencion: any) => (
                                <div key={mencion.id} className="p-4 border rounded-lg bg-white">
                                  <div className="flex justify-between items-start mb-2">
                                    <h3
                                      className="font-medium text-gray-900 truncate pr-2 flex-1"
                                      title={mencion.cliente}
                                    >
                                      {mencion.cliente}
                                    </h3>
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      <div title={mencion.tipoMencion}>{mencion.tipoMencion}</div>
                                    </Badge>
                                  </div>
                                  <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {mencion.canal}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {mencion.fecha}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {mencion.hora}
                                      </div>
                                    </div>
                                    <div className="pt-1 flex justify-end gap-2">
                                      <Button size="sm" variant="outline" onClick={() => abrirEditar(mencion)}>
                                        <PencilLine className="h-4 w-4 mr-1" />
                                        Editar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => solicitarEliminarMencion(mencion)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Eliminar
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* FAB para registrar */}
                  <button
                    onClick={abrirCrear}
                    className="fixed bottom-6 right-6 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 cursor-pointer"
                    aria-label="Registrar nueva mención"
                  >
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>

                  <RegistroModal
                    isOpen={modalAbierta}
                    onClose={cerrarModal}
                    onRegistroExitoso={cargarMenciones}
                    mencion={mencionAEditar} // edita si trae objeto; crea si null
                  />
                </>
              )}
            </TabsContent>

            {/* === TAB: CLIENTES === */}
            <TabsContent value="clientes">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Users className="h-5 w-5 text-vtv-cyan" />
                      <span>Agregar Nuevo Cliente</span>
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Registra un cliente con período de actividad
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="cliente-nombre" className="text-sm">
                          Nombre del Cliente
                        </Label>
                        <Input
                          id="cliente-nombre"
                          value={nuevoCliente.nombre}
                          onChange={(e) =>
                            setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })
                          }
                          placeholder="Ej: Banco Atlántida"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fecha-inicio" className="text-sm">
                          Fecha de Inicio
                        </Label>
                        <Input
                          id="fecha-inicio"
                          type="date"
                          value={nuevoCliente.fechaInicio}
                          onChange={(e) =>
                            setNuevoCliente({ ...nuevoCliente, fechaInicio: e.target.value })
                          }
                          className="mt-1 h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fecha-fin" className="text-sm">
                          Fecha de Fin
                        </Label>
                        <Input
                          id="fecha-fin"
                          type="date"
                          value={nuevoCliente.fechaFin}
                          onChange={(e) =>
                            setNuevoCliente({ ...nuevoCliente, fechaFin: e.target.value })
                          }
                          className="mt-1 h-10"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={() =>
                          confirmarAccion(
                            `¿Agregar cliente "${nuevoCliente.nombre}" con período del ${nuevoCliente.fechaInicio} al ${nuevoCliente.fechaFin}?`,
                            agregarCliente
                          )
                        }
                        disabled={
                          !nuevoCliente.nombre.trim() ||
                          !nuevoCliente.fechaInicio ||
                          !nuevoCliente.fechaFin
                        }
                        className="bg-vtv-cyan hover:bg-vtv-cyan/90 w-full sm:w-auto"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Agregar Cliente
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {loadingClientes ? (
                  <div className="w-full bg-gray-50 pt-16 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Clientes Registrados</CardTitle>
                      <CardDescription className="text-sm">
                        Lista de clientes con sus períodos de actividad ({clientes.length} total)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Desktop */}
                      <div className="hidden md:block">
                        <div className="grid gap-3">
                          {clientes.map((cliente) => (
                            <div key={cliente.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-4 min-w-0 flex-1">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium truncate" title={cliente.nombre}>
                                      {cliente.nombre}
                                    </span>
                                    <Badge
                                      variant={esClienteActivo(cliente) ? "default" : "secondary"}
                                      className="text-xs shrink-0"
                                    >
                                      {esClienteActivo(cliente) ? "Activo" : "Inactivo"}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {cliente.fechaInicio} - {cliente.fechaFin}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => abrirRenovarModal(cliente)}
                                  className="text-vtv-green hover:bg-vtv-green/10 text-xs"
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" /> Renovar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    confirmarAccion(
                                      `¿Estás seguro de eliminar el cliente "${cliente.nombre}"?`,
                                      () => eliminarCliente(cliente.id)
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

                      {/* Móvil */}
                      <div className="md:hidden">
                        <div className="grid gap-4">
                          {clientes.map((cliente) => (
                            <Card key={cliente.id}>
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1 pr-2">
                                      <h3 className="font-medium truncate" title={cliente.nombre}>
                                        {cliente.nombre}
                                      </h3>
                                      <p className="text-sm text-gray-500">
                                        {cliente.fechaInicio} - {cliente.fechaFin}
                                      </p>
                                    </div>
                                    <Badge
                                      variant={esClienteActivo(cliente) ? "default" : "secondary"}
                                      className="text-xs shrink-0"
                                    >
                                      {esClienteActivo(cliente) ? "Activo" : "Inactivo"}
                                    </Badge>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => abrirRenovarModal(cliente)}
                                      className="flex-1 text-vtv-green hover:bg-vtv-green/10 text-xs"
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" /> Renovar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        confirmarAccion(
                                          `¿Estás seguro de eliminar el cliente "${cliente.nombre}"?`,
                                          () => eliminarCliente(cliente.id)
                                        )
                                      }
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
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

                      {clientes.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          No hay clientes registrados
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* === TAB: TIPOS === */}
            <TabsContent value="tipos">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Tag className="h-5 w-5 text-vtv-yellow" />
                      <span>Agregar Nuevo Tipo</span>
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Registra un nuevo tipo de mención
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                      <div className="flex-1">
                        <Label htmlFor="tipo" className="text-sm">
                          Nombre del Tipo
                        </Label>
                        <Input
                          id="tipo"
                          value={nuevoTipo}
                          onChange={(e) => setNuevoTipo(e.target.value)}
                          placeholder="Ej: Cintillo, Mención en vivo, Banner"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={() =>
                            confirmarAccion(
                              `¿Estás seguro de agregar el tipo "${nuevoTipo}"? No podrás modificarlo después.`,
                              agregarTipo
                            )
                          }
                          disabled={!nuevoTipo.trim()}
                          className="bg-vtv-yellow hover:bg-vtv-yellow/90 text-black w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Agregar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {loadingTipos ? (
                  <div className="w-full bg-gray-50 pt-16 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tipos de Menciones</CardTitle>
                      <CardDescription className="text-sm">
                        Lista de todos los tipos disponibles ({tipos.length} total)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {tipos.map((tipo) => (
                          <div key={tipo.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="w-2 h-2 bg-vtv-yellow rounded-full shrink-0"></div>
                              <span className="font-medium truncate" title={tipo.nombre}>
                                {tipo.nombre}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                confirmarAccion(
                                  `¿Estás seguro de eliminar el tipo "${tipo.nombre}"?`,
                                  () => eliminarTipo(tipo.id)
                                )
                              }
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {tipos.length === 0 && (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            No hay tipos registrados
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modales globales */}
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={ejecutarAccion}
          title="Confirmar Acción"
          message={confirmMessage}
        />

        <RenovarClienteModal
          isOpen={showRenovarModal}
          onClose={() => setShowRenovarModal(false)}
          cliente={clienteARenovar}
          onRenovar={renovarCliente}
        />
      </div>

      {/* Modal de crear/editar mención */}
      <RegistroModal
        isOpen={modalAbierta}
        onClose={cerrarModal}
        onRegistroExitoso={cargarMenciones}
        mencion={mencionAEditar}
      />
    </RouteGuard>
  );
}
