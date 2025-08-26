import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, } from "firebase/firestore"
import { db } from "./firebase"
import type { Cliente, TipoMencion, Canal, Mencion } from "./data"

// Servicios para Clientes
export const clientesService = {
  async getAll(): Promise<Cliente[]> {
    try {
      const querySnapshot = await getDocs(collection(db, "clientes"))
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Cliente[]
    } catch (error) {
      console.error("Error obteniendo clientes:", error)
      return []
    }
  },

  async create(cliente: Omit<Cliente, "id">): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, "clientes"), cliente)
      return docRef.id
    } catch (error) {
      console.error("Error creando cliente:", error)
      throw error
    }
  },

  async update(id: string, data: Partial<Cliente>): Promise<void> {
    try {
      await updateDoc(doc(db, "clientes", id), data)
    } catch (error) {
      console.error("Error actualizando cliente:", error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "clientes", id))
    } catch (error) {
      console.error("Error eliminando cliente:", error)
      throw error
    }
  },

  async getActivos(): Promise<Cliente[]> {
    try {
      const clientes = await this.getAll()
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      return clientes.filter((cliente) => {
        const fin = new Date(cliente.fechaFin)
        fin.setHours(0, 0, 0, 0)
        return fin >= hoy
      })
    } catch (error) {
      console.error("Error obteniendo clientes activos:", error)
      return []
    }
  },
}

// Servicios para Tipos de Mención
export const tiposMencionService = {
  async getAll(): Promise<TipoMencion[]> {
    try {
      const querySnapshot = await getDocs(collection(db, "tipos_menciones"))
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TipoMencion[]
    } catch (error) {
      console.error("Error obteniendo tipos de mención:", error)
      return []
    }
  },

  async create(tipo: Omit<TipoMencion, "id">): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, "tipos_menciones"), tipo)
      return docRef.id
    } catch (error) {
      console.error("Error creando tipo de mención:", error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "tipos_menciones", id))
    } catch (error) {
      console.error("Error eliminando tipo de mención:", error)
      throw error
    }
  },
}

// Servicios para Canales
export const canalesService = {
  async getAll(): Promise<Canal[]> {
    try {
      const querySnapshot = await getDocs(collection(db, "canales"))
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Canal[]
    } catch (error) {
      console.error("Error obteniendo canales:", error)
      return []
    }
  },

  async create(canal: Omit<Canal, "id">): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, "canales"), canal)
      return docRef.id
    } catch (error) {
      console.error("Error creando canal:", error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "canales", id))
    } catch (error) {
      console.error("Error eliminando canal:", error)
      throw error
    }
  },
}

// Servicios para Menciones
export const mencionesService = {
  async getAll(): Promise<Mencion[]> {
    try {
      const q = query(
        collection(db, "menciones"),
        orderBy("fechaCreacion", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Mencion, "id">),
      }));
    } catch (error) {
      console.error("Error obteniendo menciones:", error);
      return [];
    }
  },

  async getByUser(usuario: string): Promise<Mencion[]> {
    try {
      const q = query(
        collection(db, "menciones"),
        where("usuario", "==", usuario),
        orderBy("fechaCreacion", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Mencion, "id">),
      }));
    } catch (error) {
      console.error("Error obteniendo menciones del usuario:", error);
      return [];
    }
  },

  async create(mencion: Omit<Mencion, "id" | "fechaCreacion">): Promise<string> {
    try {
      const payload = {
        ...mencion,
        // serverTimestamp para consistencia en ordenamiento
        fechaCreacion: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "menciones"), payload);
      return docRef.id;
    } catch (error) {
      console.error("Error creando mención:", error);
      throw error;
    }
  },

  // >>> NUEVO: actualizar parcialmente una mención
  async update(id: string, data: Partial<Omit<Mencion, "id" | "fechaCreacion">>): Promise<void> {
    try {
      const ref = doc(db, "menciones", id);
      await updateDoc(ref, {
        ...data,
        // opcional: marca de última edición si la quieres
        ultimaEdicion: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error actualizando mención:", error);
      throw error;
    }
  },

  // >>> NUEVO: eliminar una mención
  async delete(id: string): Promise<void> {
    try {
      const ref = doc(db, "menciones", id);
      await deleteDoc(ref);
    } catch (error) {
      console.error("Error eliminando mención:", error);
      throw error;
    }
  },
};

// Función para inicializar datos por defecto
export const inicializarDatosPorDefecto = async () => {
  try {
    // Verificar si ya existen datos
    const clientes = await clientesService.getAll()
    const tipos = await tiposMencionService.getAll()
    const canales = await canalesService.getAll()

    // Crear clientes por defecto si no existen
    if (clientes.length === 0) {
      await clientesService.create({
        nombre: "Banco Atlántida",
        fechaInicio: "2024-01-01",
        fechaFin: "2024-12-31",
      })
      await clientesService.create({
        nombre: "Tigo Honduras",
        fechaInicio: "2024-06-01",
        fechaFin: "2024-11-30",
      })
    }

    // Crear tipos por defecto si no existen
    if (tipos.length === 0) {
      await tiposMencionService.create({ nombre: "Cintillo" })
      await tiposMencionService.create({ nombre: "Mención en vivo" })
      await tiposMencionService.create({ nombre: "Banner" })
    }

    // Crear canales por defecto si no existen
    if (canales.length === 0) {
      await canalesService.create({ nombre: "VTV" })
      await canalesService.create({ nombre: "VTV Plus" })
      await canalesService.create({ nombre: "ANTV" })
    }
  } catch (error) {
    console.error("Error inicializando datos por defecto:", error)
  }
}