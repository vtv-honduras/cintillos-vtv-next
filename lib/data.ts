// Interfaces TypeScript
export interface TipoMencion {
  id: string
  nombre: string
  descripcion?: string
}

export interface Cliente {
  id: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  activo?: boolean
}

export interface Canal {
  id: string
  nombre: string
  descripcion?: string
}

export interface Mencion {
  id: string
  cliente: string
  tipoMencion: string
  canal: string
  fecha: string
  hora: string
  usuario: string
  fechaCreacion: string
}

export interface Usuario {
  id: string
  username: string
  password: string
  role: "admin" | "master" | "programacion"
  nombre: string
  email?: string
  activo: boolean
  fechaCreacion: string
}

// Datos iniciales
export const TIPOS_MENCIONES_INICIALES: TipoMencion[] = [
  { id: "tipo-1", nombre: "CINTILLO", descripcion: "Cintillo informativo" },
  { id: "tipo-2", nombre: "MENCIÓN", descripcion: "Mención comercial" },
  { id: "tipo-3", nombre: "PROMOCIÓN", descripcion: "Contenido promocional" },
  { id: "tipo-4", nombre: "NOTICIA", descripcion: "Contenido noticioso" },
]

export const CLIENTES_INICIALES: Cliente[] = [
  {
    id: "cliente-1",
    nombre: "Banco Atlántida",
    fechaInicio: "2024-01-01",
    fechaFin: "2024-12-31",
  },
  {
    id: "cliente-2",
    nombre: "Clean Extreme",
    fechaInicio: "2024-01-15",
    fechaFin: "2024-06-30",
  },
  {
    id: "cliente-3",
    nombre: "Supermercados La Colonia",
    fechaInicio: "2024-02-01",
    fechaFin: "2024-11-30",
  },
  {
    id: "cliente-4",
    nombre: "Tigo Honduras",
    fechaInicio: "2024-01-01",
    fechaFin: "2025-12-31",
  },
  {
    id: "cliente-5",
    nombre: "Pizza Hut",
    fechaInicio: "2024-03-01",
    fechaFin: "2024-09-30",
  },
]

export const CANALES_INICIALES: Canal[] = [
  { id: "canal-1", nombre: "Canal Principal", descripcion: "Canal principal de transmisión" },
  { id: "canal-2", nombre: "Canal 2", descripcion: "Canal secundario" },
  { id: "canal-3", nombre: "Canal Digital", descripcion: "Plataforma digital" },
]

export const USUARIOS_INICIALES: Usuario[] = [
  {
    id: "user-1",
    username: "admin",
    password: "admin123",
    role: "admin",
    nombre: "Administrador del Sistema",
    email: "admin@vtv.hn",
    activo: true,
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: "user-2",
    username: "master",
    password: "master123",
    role: "master",
    nombre: "Usuario Master",
    email: "master@vtv.hn",
    activo: true,
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: "user-3",
    username: "programacion",
    password: "prog123",
    role: "programacion",
    nombre: "Usuario Programación",
    email: "programacion@vtv.hn",
    activo: true,
    fechaCreacion: new Date().toISOString(),
  },
]

// Funciones utilitarias
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function getStoredData<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue

  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error)
    return defaultValue
  }
}

export function setStoredData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error)
  }
}

// Función para inicializar datos de muestra
export function initializeSampleData(): void {
  if (typeof window === "undefined") return

  // Inicializar tipos de menciones si no existen
  if (!localStorage.getItem("tipos_menciones")) {
    setStoredData("tipos_menciones", TIPOS_MENCIONES_INICIALES)
  }

  // Inicializar clientes si no existen
  if (!localStorage.getItem("clientes")) {
    setStoredData("clientes", CLIENTES_INICIALES)
  }

  // Inicializar canales si no existen
  if (!localStorage.getItem("canales")) {
    setStoredData("canales", CANALES_INICIALES)
  }

  if (!localStorage.getItem("usuarios")) {
    setStoredData("usuarios", USUARIOS_INICIALES)
  }

  // Inicializar menciones de muestra si no existen
  if (!localStorage.getItem("menciones")) {
    const mencionesIniciales: Mencion[] = [
      {
        id: generateId(),
        cliente: "Banco Atlántida",
        tipoMencion: "CINTILLO",
        canal: "Canal Principal",
        fecha: "2024-01-15",
        hora: "08:30",
        usuario: "master",
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: generateId(),
        cliente: "Clean Extreme",
        tipoMencion: "MENCIÓN",
        canal: "Canal 2",
        fecha: "2024-01-15",
        hora: "14:15",
        usuario: "master",
        fechaCreacion: new Date().toISOString(),
      },
      {
        id: generateId(),
        cliente: "Tigo Honduras",
        tipoMencion: "PROMOCIÓN",
        canal: "Canal Digital",
        fecha: "2024-01-16",
        hora: "10:45",
        usuario: "admin",
        fechaCreacion: new Date().toISOString(),
      },
    ]
    setStoredData("menciones", mencionesIniciales)
  }
}

// Función para verificar si un cliente está activo
export function isClienteActivo(cliente: Cliente): boolean {
  const hoy = new Date()
  const fechaInicio = new Date(cliente.fechaInicio)
  const fechaFin = new Date(cliente.fechaFin)

  return hoy >= fechaInicio && hoy <= fechaFin
}

export function getClientesActivos(clientes: Cliente[]): Cliente[] {
  return clientes.filter(isClienteActivo)
}

export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "admin":
      return "bg-red-100 text-red-800"
    case "master":
      return "bg-blue-100 text-blue-800"
    case "programacion":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function getRoleDisplayName(role: string): string {
  switch (role) {
    case "admin":
      return "Administrador"
    case "master":
      return "Master"
    case "programacion":
      return "Programación"
    default:
      return role
  }
}

export function getRoleColor(role: string): string {
  return getRoleBadgeColor(role)
}

export function getRoleName(role: string): string {
  return getRoleDisplayName(role)
}
