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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegistroModal } from "@/components/registro-modal";
import { Plus, FileText, Calendar, Clock, Filter, Loader2 } from "lucide-react";

import type { Mencion } from "@/lib/data";
import { mencionesService } from "@/lib/firebase-services";

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

export default function MasterPage() {
  const [menciones, setMenciones] = useState<Mencion[]>([]);
  const [modalAbierta, setModalAbierta] = useState(false);
  const [filtroTiempo, setFiltroTiempo] = useState<
    "todos" | "hoy" | "semana" | "mes" | "personalizado"
  >("hoy");
  const [filtroPersonalizado, setFiltroPersonalizado] = useState({
    fechaInicio: "",
    fechaFin: "",
  });
  const [loading, setLoading] = useState(true);

  const usuario = useMemo(getUsuarioActual, []);
  const hoyStr = yyyymmddLocal(new Date());

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

  useEffect(() => {
    cargarMenciones();
  }, []);

  const cerrarModal = () => setModalAbierta(false);
  const handleRegistroExitoso = () => cargarMenciones();

  const mencionesDelUsuario = useMemo(
    () => menciones.filter((m) => isMencionDelUsuario(m, usuario)),
    [menciones, usuario]
  );

  const mencionesFiltradas = useMemo(() => {
    const lista = [...mencionesDelUsuario];
    if (filtroTiempo === "todos") return lista;

    if (filtroTiempo === "hoy") {
      return lista.filter((m: any) => m.fecha === hoyStr);
    }
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
      return lista.filter(
        (m: any) => m.fecha >= fechaInicio && m.fecha <= fechaFin
      );
    }
    return lista;
  }, [mencionesDelUsuario, filtroTiempo, filtroPersonalizado, hoyStr]);

  const estadisticas = useMemo(() => {
    const total = mencionesDelUsuario.length;
    const hoy = mencionesDelUsuario.filter(
      (m: any) => m.fecha === hoyStr
    ).length;

    const semana = (() => {
      const inicio = startOfWeekLocal().getTime();
      return mencionesDelUsuario.filter(
        (m: any) => new Date(m.fecha).getTime() >= inicio
      ).length;
    })();

    const filtradas = mencionesFiltradas.length;
    return { total, hoy, estaSemana: semana, filtradas };
  }, [mencionesDelUsuario, mencionesFiltradas, hoyStr]);

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
              Consulta tu historial y registra nuevas menciones
            </p>
          </div>

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
                        <p className="text-sm text-gray-600">
                          Total Registradas
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">
                          {estadisticas.total}
                        </p>
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
                        <p className="text-xl sm:text-2xl font-bold text-green-600">
                          {estadisticas.hoy}
                        </p>
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
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">
                          {estadisticas.estaSemana}
                        </p>
                      </div>
                      <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filtros de tiempo */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Filter className="h-5 w-5" />
                    Filtrar por Tiempo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="filtro-tiempo">Período</Label>
                      <Select
                        value={filtroTiempo}
                        onValueChange={(v: any) => setFiltroTiempo(v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="hoy">Hoy</SelectItem>
                          <SelectItem value="semana">Esta Semana</SelectItem>
                          <SelectItem value="mes">Este Mes</SelectItem>
                          <SelectItem value="personalizado">
                            Personalizado
                          </SelectItem>
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
                              setFiltroPersonalizado({
                                ...filtroPersonalizado,
                                fechaInicio: e.target.value,
                              })
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
                              setFiltroPersonalizado({
                                ...filtroPersonalizado,
                                fechaFin: e.target.value,
                              })
                            }
                            className="mt-1"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {filtroTiempo !== "todos" && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        Mostrando {estadisticas.filtradas} de{" "}
                        {estadisticas.total} registros
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Historial personal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Mi Historial ({mencionesFiltradas.length})
                  </CardTitle>
                  <CardDescription>
                    Menciones registradas por ti
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-10 text-gray-500">
                      Cargando...
                    </div>
                  ) : mencionesFiltradas.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-base sm:text-lg">
                        {filtroTiempo === "todos"
                          ? "No has registrado menciones aún"
                          : "No hay menciones en este período"}
                      </p>
                      <p className="text-sm">
                        {filtroTiempo === "todos"
                          ? "Usa el botón + para registrar tu primera mención"
                          : "Cambia el filtro para ver más registros"}
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
                                <th className="text-left p-3 font-medium text-gray-900">
                                  Cliente
                                </th>
                                <th className="text-left p-3 font-medium text-gray-900">
                                  Tipo
                                </th>
                                <th className="text-left p-3 font-medium text-gray-900">
                                  Canal
                                </th>
                                <th className="text-left p-3 font-medium text-gray-900">
                                  Fecha
                                </th>
                                <th className="text-left p-3 font-medium text-gray-900">
                                  Hora
                                </th>
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
                                  <tr
                                    key={mencion.id}
                                    className="border-b hover:bg-gray-50"
                                  >
                                    <td className="p-3 font-medium max-w-xs">
                                      <div
                                        className="truncate"
                                        title={mencion.cliente}
                                      >
                                        {mencion.cliente}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        <div title={mencion.tipoMencion}>
                                          {mencion.tipoMencion}
                                        </div>
                                      </Badge>
                                    </td>
                                    <td className="p-3">
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {mencion.canal}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-sm">
                                      {mencion.fecha}
                                    </td>
                                    <td className="p-3 text-sm">
                                      {mencion.hora}
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
                            <div
                              key={mencion.id}
                              className="p-4 border rounded-lg bg-white"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3
                                  className="font-medium text-gray-900 truncate pr-2 flex-1"
                                  title={mencion.cliente}
                                >
                                  {mencion.cliente}
                                </h3>
                                <Badge
                                  variant="secondary"
                                  className="text-xs shrink-0"
                                >
                                  <div title={mencion.tipoMencion}>
                                    {mencion.tipoMencion}
                                  </div>
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
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <button
          onClick={() => setModalAbierta(true)}
          className="fixed bottom-6 right-6 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50"
          aria-label="Registrar nueva mención"
        >
          <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <RegistroModal
          isOpen={modalAbierta}
          onClose={cerrarModal}
          onRegistroExitoso={handleRegistroExitoso}
        />
      </div>
    </RouteGuard>
  );
}
