import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  getIdTokenResult,
  getIdToken
} from "firebase/auth";
import { auth } from "./firebase";

const login = async (email: string, password: string) => {
  try {
    if (!email || !password) {
      console.log("Debe de llenar los campos");
      return { authenticated: false };
    }
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
       if (!user.emailVerified) {
        await forgotPassword(email);
        await logout();
        return { authenticated: false, firstInit: true };
      }
  
    console.log("Inicio de sesión exitoso");
    return { authenticated: true, firstInit: false };
  } catch (error: any) {
    handleAuthError(error);
    return { authenticated: false, firstInit: false  };
  }
};

const forgotPassword = async (email: string) => {
  try {
    if (!email) {
      console.log("Por favor, ingresa tu correo electrónico.");
      return;
    }
    await sendPasswordResetEmail(auth, email);
    console.log(
      "Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico."
    );
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

          }
        });
      } else {
        console.log("No hay sesión activa.");
        resolve({ email: "", nombre: "", uid: null, authenticated: false, rol: {} });
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

const handleAuthError = (error: any) => {
  let errorMessage = "Error inesperado.";
  if (error.code === "auth/invalid-credential") {
    errorMessage = "Credenciales incorrectas.";
  } else if (error.code === "auth/user-not-found") {
    errorMessage = "Usuario no encontrado.";
  } else if (error.code === "auth/invalid-email") {
    errorMessage = "Correo electrónico no válido.";
  }
  console.log("Error de Autenticación:", errorMessage);
};

const getToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;

    if (user) {
      const token = await getIdToken(user);
      return token;
    }
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (user) {
          try {
            const token = await getIdToken(user);
            resolve(token);
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

export { login, logout, forgotPassword, checkActiveSession, getToken };
