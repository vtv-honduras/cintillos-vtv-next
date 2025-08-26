import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  getIdTokenResult,
  getIdToken,
} from "firebase/auth";
import { auth } from "./firebase";

type LoginResult = {
  authenticated: boolean;
  firstInit?: boolean;
  disabled?: boolean;
  message?: string;
};

const login = async (email: string, password: string): Promise<LoginResult> => {
  try {
    if (!email || !password) {
      return { authenticated: false, message: "Debe llenar los campos." };
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

   { /*if (!user.emailVerified) {
      await forgotPassword(email);
      await logout();
      return {
        authenticated: false,
        firstInit: true,
        message: "Te enviamos un correo para verificar tu cuenta.",
      };
    }*/}
    await user.getIdToken(true);
    const idTokenResult = await getIdTokenResult(user);

    const activo = Boolean(idTokenResult.claims.activo);
    if (!activo) {
      await logout();
      return {
        authenticated: false,
        disabled: true,
        message:
          "Tu usuario está desactivado. Por favor, contacta al equipo de TI.",
      };
    }

    console.log("Inicio de sesión exitoso");
    return { authenticated: true, firstInit: false };
  } catch (error: any) {
   return mapAuthError(error);
  }
};

const forgotPassword = async (email: string) => {
  try {
    if (!email) {
      console.log("Por favor, ingresa tu correo electrónico.");
      return;
    }
    await sendPasswordResetEmail(auth, email);
    console.log("Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico.");
  } catch (error: any) {
    console.log("Error al enviar el correo de recuperación:", error.message);
  }
};

const checkActiveSession = () => {
  return new Promise<{
    email: string;
    nombre: string;
    uid: string | null;
    authenticated: boolean;
    rol: any;
    activo?: boolean;
  }>((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idTokenResult = await getIdTokenResult(user);
        resolve({
          email: user.email ?? "",
          nombre: user.displayName ?? "",
          uid: user.uid ?? null,
          authenticated: true,
          rol: {
            rol: idTokenResult.claims.rol,
            rol_id: idTokenResult.claims.rol_id,
          },
          activo: Boolean(idTokenResult.claims.activo),
        });
      } else {
        console.log("No hay sesión activa.");
        resolve({
          email: "",
          nombre: "",
          uid: null,
          authenticated: false,
          rol: {},
          activo: false,
        });
      }
    });
  });
};

const logout = async () => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("init_login");
    }
    await signOut(auth);
    console.log("Sesión cerrada. Nos vemos pronto!");
    return { success: true };
  } catch (error: any) {
    console.log("Error al cerrar sesión:", error.message);
    return { success: false, error: error.message };
  }
};


const getToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (user) return await getIdToken(user);
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (user) {
          try {
            resolve(await getIdToken(user));
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error("No hay un usuario autenticado."));
        }
      });
    });
  } catch (error) {
    console.error("Error al obtener el token:", error);
    throw error;
  }
};

const mapAuthError = (error: any): LoginResult => {
  const code = error?.code ?? "auth/unknown";

  switch (code) {
    case "auth/user-disabled":
      return {
        authenticated: false,
        disabled: true,
        message: "Tu usuario está desactivado. Por favor, contacta al equipo de TI.",
      };
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return { authenticated: false, message: "Credenciales incorrectas." };
    case "auth/invalid-email":
      return { authenticated: false, message: "Correo electrónico no válido." };
    case "auth/too-many-requests":
      return { authenticated: false, message: "Demasiados intentos. Intenta más tarde." };
    case "auth/network-request-failed":
      return { authenticated: false, message: "Problema de red. Revisa tu conexión." };
    default:
      return { authenticated: false, message: "No se pudo iniciar sesión. Intenta nuevamente." };
  }
};


export { login, logout, forgotPassword, checkActiveSession, getToken };
