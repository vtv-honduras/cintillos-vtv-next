// app/api/usuarios/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, db } from "@/lib/firebaseAdmin";

type PostBody = {
  username?: string;          // opcional si no lo usas en Auth
  password: string;
  role: string;
  name: string;
  email: string;
  activo?: boolean;         
};

type PutBody = {
  id: string;                 // uid de Firebase
  activo?: boolean;
  role?: string;
  name?: string;
  email?: string;
};

const USERS_COLLECTION = "usuarios";

/** Helper: set custom claims coherentes en Auth */
async function setClaims(uid: string, claims: { role: string; nombre: string; email: string; activo: boolean }) {
  await adminAuth.setCustomUserClaims(uid, claims);
}

/** Helper: normaliza documento de Firestore para respuesta */
function toResponse(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ...data,
  };
}

/** GET: lista usuarios desde Firestore */
export async function GET() {
  try {
    const snap = await db.collection(USERS_COLLECTION).get();
    const users = snap.docs.map(toResponse);
    return NextResponse.json(users);
  } catch (err: any) {
    console.error("GET /api/usuarios error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/** POST: crea user en Auth, setea claims y guarda en Firestore */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PostBody;
    const { password, role, name, email } = body;

    if (!password || !role || !name || !email) {
      return NextResponse.json({ error: "Faltan campos requeridos (password, role, name, email)" }, { status: 400 });
    }

    const activo = body.activo ?? true;

    // 1) Crear usuario en Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: email.trim(),
      password,
      displayName: name.trim(),
      disabled: !activo,
    });

    const uid = userRecord.uid;

    // 2) Claims
    const claims = {
      role,
      nombre: name.trim(),
      email: email.trim(),
      activo,
    };
    await setClaims(uid, claims);

    // 3) Guardar en Firestore (colección "usuarios")
    const userDocData = {
      nombre: name.trim(),
      email: email.trim(),
      role,
      activo,
      fechaCreacion: new Date().toISOString()
    
    };

    await db.collection(USERS_COLLECTION).doc(uid).set(userDocData);

    return NextResponse.json({ id: uid, ...userDocData }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/usuarios error:", err);
    // Si falla a mitad, podrías limpiar Auth/Firestore (best-effort) — opcional
    return NextResponse.json({ error: err?.message ?? "Error interno del servidor" }, { status: 500 });
  }
}

/** PUT: actualiza estado y/o datos; sincroniza Auth, claims y Firestore */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as PutBody;
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "ID (uid) requerido" }, { status: 400 });
    }

    // Leer doc actual
    const ref = db.collection(USERS_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const current = snap.data()!;
    const nextActivo = typeof body.activo === "boolean" ? body.activo : current.activo;
    const nextRole = body.role ?? current.role;
    const nextName = body.name ?? current.nombre ?? current.name ?? "";
    const nextEmail = body.email ?? current.email ?? "";

    // 1) Actualizar en Auth (disable refleja activo=false)
    await adminAuth.updateUser(id, {
      displayName: nextName,
      email: nextEmail || undefined,
      disabled: !nextActivo,
    });

    // 2) Actualizar claims
    await setClaims(id, {
      role: nextRole,
      nombre: nextName,
      email: nextEmail,
      activo: nextActivo,
    });

    // 3) Actualizar Firestore
    const patch = {
      nombre: nextName,
      email: nextEmail,
      role: nextRole,
      activo: nextActivo,
      fechaActualizacion: new Date().toISOString(),
    };
    await ref.update(patch);

    const updated = (await ref.get()).data();
    return NextResponse.json({ id, ...updated });
  } catch (err: any) {
    console.error("PUT /api/usuarios error:", err);
    return NextResponse.json({ error: err?.message ?? "Error interno del servidor" }, { status: 500 });
  }
}

/** DELETE: elimina usuario de Auth y documento en Firestore */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID (uid) requerido" }, { status: 400 });
    }

    // Eliminar en Auth
    await adminAuth.deleteUser(id);

    // Eliminar doc en Firestore
    await db.collection(USERS_COLLECTION).doc(id).delete();

    return NextResponse.json({ message: "Usuario eliminado correctamente" });
  } catch (err: any) {
    console.error("DELETE /api/usuarios error:", err);
    return NextResponse.json({ error: err?.message ?? "Error interno del servidor" }, { status: 500 });
  }
}
