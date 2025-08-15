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
  master: string
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
