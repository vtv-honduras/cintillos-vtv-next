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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, BarChart3, Loader2 } from "lucide-react";
import { RouteGuard } from "@/components/route-guard";
import { Navbar } from "@/components/navbar";
import { mencionesService } from "@/lib/firebase-services";
import type { Mencion } from "@/lib/data";

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
  const [loading, setLoading] = useState(true);

  // filtros
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [modoFecha, setModoFecha] = useState<"mes" | "rango">("mes");
  const [rangoFecha, setRangoFecha] = useState({ inicio: "", fin: "" });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await cargarMenciones();
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

  const exportarPDF = () => {
    const registrosFiltrados = filtrarMenciones();

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

  const filtrarMenciones = () => {
    return menciones.filter((mencion) => {
      // Fecha
      const cumpleFecha =
        (modoFecha === "mes" &&
          (!filtroFecha || mencion.fecha.startsWith(filtroFecha))) ||
        (modoFecha === "rango" &&
          (!rangoFecha.inicio ||
            !rangoFecha.fin ||
            (mencion.fecha >= rangoFecha.inicio &&
              mencion.fecha <= rangoFecha.fin)));

      // Tipo
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

      // Cliente
      const clienteFiltro = normalize(filtroCliente);
      const clienteMencion = normalize(mencion.cliente);
      const cumpleCliente = !clienteFiltro || clienteMencion.includes(clienteFiltro);

      return cumpleFecha && cumpleTipo && cumpleCliente;
    });
  };

  const registrosFiltrados = filtrarMenciones();

  return (
    <RouteGuard requiredRole={"programacion"}>
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
                Consulta de registros de menciones
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
            <div className="grid gap-6">
              {/* Estadísticas + Exportación */}
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
                    <p className="text-sm text-gray-600">Registros encontrados</p>
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
                  <CardTitle className="text-lg">Filtros de Búsqueda</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Modo de fecha */}
                    <div>
                      <Label htmlFor="modo-fecha" className="text-sm">
                        Fecha
                      </Label>
                      <select
                        id="modo-fecha"
                        value={modoFecha}
                        onChange={(e) => setModoFecha(e.target.value as "mes" | "rango")}
                        className="mt-1 h-10 w-full border rounded-md px-3"
                      >
                        <option value="mes">Por mes</option>
                        <option value="rango">Rango personalizado</option>
                      </select>
                    </div>

                    {modoFecha === "mes" && (
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
                    )}

                    {modoFecha === "rango" && (
                      <>
                        <div>
                          <Label htmlFor="fecha-inicio" className="text-sm">
                            Desde
                          </Label>
                          <Input
                            id="fecha-inicio"
                            type="date"
                            value={rangoFecha.inicio}
                            onChange={(e) =>
                              setRangoFecha((r) => ({ ...r, inicio: e.target.value }))
                            }
                            className="mt-1 h-10"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fecha-fin" className="text-sm">
                            Hasta
                          </Label>
                          <Input
                            id="fecha-fin"
                            type="date"
                            value={rangoFecha.fin}
                            onChange={(e) =>
                              setRangoFecha((r) => ({ ...r, fin: e.target.value }))
                            }
                            className="mt-1 h-10"
                          />
                        </div>
                      </>
                    )}

                    {/* Filtro Tipo */}
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

                    {/* Filtro Cliente */}
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
                  <CardTitle className="text-lg">Registros de Menciones</CardTitle>
                  <CardDescription className="text-sm">
                    Mostrando {registrosFiltrados.length} de {menciones.length} registros
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Vista desktop */}
                  <div className="hidden md:block">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-sm">Fecha</TableHead>
                            <TableHead className="text-sm">Hora</TableHead>
                            <TableHead className="text-sm">Cliente</TableHead>
                            <TableHead className="text-sm">Tipo</TableHead>
                            <TableHead className="text-sm">Canal</TableHead>
                            <TableHead className="text-sm">Operador</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registrosFiltrados.map((mencion) => (
                            <TableRow key={mencion.id}>
                              <TableCell className="text-sm">{mencion.fecha}</TableCell>
                              <TableCell className="text-sm">{mencion.hora}</TableCell>
                              <TableCell className="text-sm max-w-32">
                                <div className="truncate" title={mencion.cliente}>
                                  {mencion.cliente}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                <Badge variant="outline" className="text-xs">
                                  <div title={mencion.tipoMencion}>{mencion.tipoMencion}</div>
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                <Badge className="bg-vtv-blue text-white text-xs">
                                  {mencion.canal}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm max-w-24">
                                <div className="truncate" title={mencion.master}>
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
                                <span className="font-medium text-sm pr-2 flex-1" title={mencion.cliente}>
                                  {mencion.cliente}
                                </span>
                                <Badge className="bg-vtv-blue text-white text-xs shrink-0">
                                  {mencion.canal}
                                </Badge>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                <div title={mencion.tipoMencion}>{mencion.tipoMencion}</div>
                              </Badge>
                              <div className="flex items-center space-x-2 flex-wrap gap-1">
                                <span className="text-xs text-gray-500">{mencion.fecha}</span>
                                <span className="text-xs text-gray-500">{mencion.hora}</span>
                              </div>
                              <div className="text-xs text-gray-600 truncate" title={`Registrado por: ${mencion.master}`}>
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
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
