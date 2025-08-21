"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trash2,
  Plus,
  FileText,
  Download,
  Users,
  Tag,
  BarChart3,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { RouteGuard } from "@/components/route-guard";
import { Navbar } from "@/components/navbar";
import ConfirmationModal from "@/components/confirmation-modal";
import RenovarClienteModal from "@/components/renovar-cliente-modal";
import {
  clientesService,
  tiposMencionService,
  inicializarDatosPorDefecto,
  mencionesService,
} from "@/lib/firebase-services";
import type { Mencion, Cliente, TipoMencion } from "@/lib/data";
// --- helpers de normalización y matching ---
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const splitTipos = (tipoMencion: string) =>
  tipoMencion.split("+").map((t) => normalize(t.replace(/\s+/g, " ")));

const parseSearch = (raw: string) =>
  raw
    .split(",") // permite coma como separador de términos
    .map((t) => normalize(t))
    .filter(Boolean);

export default function ProgramacionPage() {
  const [menciones, setMenciones] = useState<Mencion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tipos, setTipos] = useState<TipoMencion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
  });
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRenovarModal, setShowRenovarModal] = useState(false);
  const [clienteARenovar, setClienteARenovar] = useState<Cliente | null>(null);
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});
  const [confirmMessage, setConfirmMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await inicializarDatosPorDefecto();
      await Promise.all([cargarMenciones(), cargarClientes(), cargarTipos()]);
      const fechaActual = new Date();
      const mesActual = `${fechaActual.getFullYear()}-${String(
        fechaActual.getMonth() + 1
      ).padStart(2, "0")}`;
      setFiltroFecha(mesActual);
      setLoading(false);
    };
    init();
  }, []);

  const cargarMenciones = async () => {
    try {
      const mencionesData = await mencionesService.getAll();
      setMenciones(mencionesData);
    } catch (error) {
      console.error("Error cargando menciones:", error);
    }
  };

  const cargarClientes = async () => {
    try {
      setLoadingClientes(true);
      const clientesData = await clientesService.getAll();
      setClientes(clientesData);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setLoadingClientes(false);
    }
  };

  const cargarTipos = async () => {
    try {
      setLoadingTipos(true);
      const tiposData = await tiposMencionService.getAll();
      setTipos(tiposData);
    } catch (error) {
      console.error("Error cargando tipos:", error);
    } finally {
      setLoadingTipos(false);
    }
  };

  const confirmarAccion = (mensaje: string, accion: () => void) => {
    setConfirmMessage(mensaje);
    setPendingAction(() => accion);
    setShowConfirmModal(true);
  };

  const ejecutarAccion = () => {
    pendingAction();
    setShowConfirmModal(false);
  };

  const esClienteActivo = (cliente: Cliente) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(cliente.fechaFin);
    fin.setHours(0, 0, 0, 0);
    return fin >= hoy;
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
      setLoadingClientes(false);
    } catch (error) {
      console.error("Error renovando cliente:", error);
      alert("Error al renovar cliente");
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
        setLoadingClientes(false);
      } catch (error) {
        console.error("Error agregando cliente:", error);
        alert("Error al agregar cliente");
      }
    }
  };

  const eliminarCliente = async (id: string) => {
    try {
      setLoadingClientes(true);
      await clientesService.delete(id);
      await cargarClientes();
      setLoadingClientes(false);
    } catch (error) {
      console.error("Error eliminando cliente:", error);
      alert("Error al eliminar cliente");
    }
  };

  const agregarTipo = async () => {
    if (nuevoTipo.trim()) {
      try {
        setLoadingTipos(true);
        await tiposMencionService.create({
          nombre: nuevoTipo.trim(),
        });

        setNuevoTipo("");
        await cargarTipos();
        setLoadingTipos(false);
      } catch (error) {
        console.error("Error agregando tipo:", error);
        alert("Error al agregar tipo de mención");
      }
    }
  };

  const eliminarTipo = async (id: string) => {
    try {
      setLoadingTipos(true);
      await tiposMencionService.delete(id);
      await cargarTipos();
      setLoadingTipos(false);
    } catch (error) {
      console.error("Error eliminando tipo:", error);
      alert("Error al eliminar tipo de mención");
    }
  };

  const exportarPDF = () => {
    const registrosFiltrados = menciones.filter((mencion) => {
      const cumpleFecha = !filtroFecha || mencion.fecha.startsWith(filtroFecha);
      const cumpleTipo =
        !filtroTipo || mencion.tipoMencion.includes(filtroTipo);
      const cumpleCliente =
        !filtroCliente ||
        mencion.cliente.toLowerCase().includes(filtroCliente.toLowerCase());
      return cumpleFecha && cumpleTipo && cumpleCliente;
    });

    const contenido = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Menciones - VTV Honduras</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { color: #1e40af; font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { margin-top: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">VTV Honduras</div>
            <h2>Reporte de Menciones</h2>
            <p>Generado el: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="total">Total de registros: ${
            registrosFiltrados.length
          }</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Canal</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              ${registrosFiltrados
                .map(
                  (mencion) => `
                <tr>
                  <td>${mencion.fecha}</td>
                  <td>${mencion.hora}</td>
                  <td>${mencion.cliente}</td>
                  <td>${mencion.tipoMencion}</td>
                  <td>${mencion.canal}</td>
                  <td>${mencion.master}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const ventana = window.open("", "_blank");
    if (ventana) {
      ventana.document.write(contenido);
      ventana.document.close();
      ventana.print();
    }
  };

  const registrosFiltrados = menciones.filter((mencion) => {
    const cumpleFecha = !filtroFecha || mencion.fecha.startsWith(filtroFecha);

    const terminosTipo = parseSearch(filtroTipo);
    const tiposDeLaMencion = splitTipos(mencion.tipoMencion);
    const tipoPlano = normalize(mencion.tipoMencion);

    const cumpleTipo =
      terminosTipo.length === 0 ||
      terminosTipo.every(
        (term) =>
          tipoPlano.includes(term) ||
          tiposDeLaMencion.some((t) => t.includes(term))
      );

    const clienteFiltro = normalize(filtroCliente);
    const clienteMencion = normalize(mencion.cliente);
    const cumpleCliente =
      !clienteFiltro || clienteMencion.includes(clienteFiltro);

    return cumpleFecha && cumpleTipo && cumpleCliente;
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar title="Panel de Programación" />
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-vtv-green/10 rounded-lg">
            <BarChart3 className="h-6 w-6 text-vtv-green" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Panel de Programación
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Consulta de registros y gestión de datos maestros
            </p>
          </div>
        </div>
        {loading ? (
          <div className="w-full bg-gray-50 pt-16 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </div>
        ) : (
          <Tabs defaultValue="registros" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="registros"
                className="flex items-center space-x-2 text-sm"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Registros</span>
              </TabsTrigger>
              <TabsTrigger
                value="clientes"
                className="flex items-center space-x-2 text-sm"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Clientes</span>
              </TabsTrigger>
              <TabsTrigger
                value="tipos"
                className="flex items-center space-x-2 text-sm"
              >
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Tipos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="registros">
              <div className="grid gap-6">
                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5 text-vtv-blue" />
                        <span>Total de Registros</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl sm:text-3xl font-bold text-vtv-blue">
                        {registrosFiltrados.length}
                      </div>
                      <p className="text-sm text-gray-600">
                        Registros encontrados
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg flex items-center space-x-2">
                        <Download className="h-5 w-5 text-vtv-green" />
                        <span>Exportar Datos</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={exportarPDF}
                        className="w-full bg-vtv-green hover:bg-vtv-green/90 text-sm"
                        disabled={registrosFiltrados.length === 0}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar PDF
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Filtros */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Filtros de Búsqueda
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="filtro-fecha" className="text-sm">
                          Mes
                        </Label>
                        <Input
                          id="filtro-fecha"
                          type="month"
                          value={filtroFecha}
                          onChange={(e) => setFiltroFecha(e.target.value)}
                          className="mt-1 h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="filtro-tipo" className="text-sm">
                          Tipo de Mención
                        </Label>
                        <Input
                          id="filtro-tipo"
                          value={filtroTipo}
                          onChange={(e) => setFiltroTipo(e.target.value)}
                          placeholder="Ej: mencion, cintillo (coincidencia parcial)"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="filtro-cliente" className="text-sm">
                          Cliente
                        </Label>
                        <Input
                          id="filtro-cliente"
                          value={filtroCliente}
                          onChange={(e) => setFiltroCliente(e.target.value)}
                          placeholder="Filtrar por cliente..."
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabla de registros */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Registros de Menciones
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Mostrando {registrosFiltrados.length} de{" "}
                      {menciones.length} registros
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Vista desktop */}
                    <div className="hidden md:block">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                               <TableHead className="text-sm">ID</TableHead>
                              <TableHead className="text-sm">Fecha</TableHead>
                              <TableHead className="text-sm">Hora</TableHead>
                              <TableHead className="text-sm">Cliente</TableHead>
                              <TableHead className="text-sm">Tipo</TableHead>
                              <TableHead className="text-sm">Canal</TableHead>
                              <TableHead className="text-sm">
                                Operador
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {registrosFiltrados.map((mencion) => (
                              <TableRow key={mencion.id}>
                                 <TableCell className="text-sm">
                                  {mencion.id}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {mencion.fecha}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {mencion.hora}
                                </TableCell>
                                <TableCell className="text-sm max-w-32">
                                  <div
                                    className="truncate"
                                    title={mencion.cliente}
                                  >
                                    {mencion.cliente}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <Badge variant="outline" className="text-xs">
                                    <div title={mencion.tipoMencion}>
                                      {mencion.tipoMencion}
                                    </div>
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <Badge className="bg-vtv-blue text-white text-xs">
                                    {mencion.canal}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm max-w-24">
                                  <div
                                    className="truncate"
                                    title={mencion.usuario}
                                  >
                                    {mencion.master}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Vista móvil - Cards */}
                    <div className="md:hidden">
                      <div className="grid gap-4">
                        {registrosFiltrados.map((mencion) => (
                          <Card key={mencion.id}>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span
                                    className="font-medium text-sm pr-2 flex-1"
                                    title={mencion.cliente}
                                  >
                                    {mencion.cliente}
                                  </span>
                                  <Badge className="bg-vtv-blue text-white text-xs shrink-0">
                                    {mencion.canal}
                                  </Badge>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  <div title={mencion.tipoMencion}>
                                    {mencion.tipoMencion}
                                  </div>
                                </Badge>
                                <div className="flex items-center space-x-2 flex-wrap gap-1">
                                  <span className="text-xs text-gray-500">
                                    {mencion.fecha}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {mencion.hora}
                                  </span>
                                </div>
                                <div
                                  className="text-xs text-gray-600 truncate"
                                  title={`Registrado por: ${mencion.master}`}
                                >
                                  Registrado por: {mencion.master}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {registrosFiltrados.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No se encontraron registros con los filtros aplicados
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

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
                            setNuevoCliente({
                              ...nuevoCliente,
                              nombre: e.target.value,
                            })
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
                            setNuevoCliente({
                              ...nuevoCliente,
                              fechaInicio: e.target.value,
                            })
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
                            setNuevoCliente({
                              ...nuevoCliente,
                              fechaFin: e.target.value,
                            })
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
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Cliente
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
                      <CardTitle className="text-lg">
                        Clientes Registrados
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Lista de clientes con sus períodos de actividad (
                        {clientes.length} total)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Vista desktop */}
                      <div className="hidden md:block">
                        <div className="grid gap-3">
                          {clientes.map((cliente) => (
                            <div
                              key={cliente.id}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div className="flex items-center space-x-4 min-w-0 flex-1">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span
                                      className="font-medium truncate"
                                      title={cliente.nombre}
                                    >
                                      {cliente.nombre}
                                    </span>
                                    <Badge
                                      variant={
                                        esClienteActivo(cliente)
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs shrink-0"
                                    >
                                      {esClienteActivo(cliente)
                                        ? "Activo"
                                        : "Inactivo"}
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
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Renovar
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

                      {/* Vista móvil - Cards */}
                      <div className="md:hidden">
                        <div className="grid gap-4">
                          {clientes.map((cliente) => (
                            <Card key={cliente.id}>
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1 pr-2">
                                      <h3
                                        className="font-medium truncate"
                                        title={cliente.nombre}
                                      >
                                        {cliente.nombre}
                                      </h3>
                                      <p className="text-sm text-gray-500">
                                        {cliente.fechaInicio} -{" "}
                                        {cliente.fechaFin}
                                      </p>
                                    </div>
                                    <Badge
                                      variant={
                                        esClienteActivo(cliente)
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs shrink-0"
                                    >
                                      {esClienteActivo(cliente)
                                        ? "Activo"
                                        : "Inactivo"}
                                    </Badge>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => abrirRenovarModal(cliente)}
                                      className="flex-1 text-vtv-green hover:bg-vtv-green/10 text-xs"
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Renovar
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
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar
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
                      <CardTitle className="text-lg">
                        Tipos de Menciones
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Lista de todos los tipos disponibles ({tipos.length}{" "}
                        total)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {tipos.map((tipo) => (
                          <div
                            key={tipo.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="w-2 h-2 bg-vtv-yellow rounded-full shrink-0"></div>
                              <span
                                className="font-medium truncate"
                                title={tipo.nombre}
                              >
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
        )}

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
    </div>
  );
}
