"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface User {
  username: string;
  name: string;
  role: "admin" | "master" | "programacion" | string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const raw = localStorage.getItem("user") || localStorage.getItem("user_session");
      if (raw) {
        try {
          const data = JSON.parse(raw);
          const role = (data.role || data.rol || "").toString().toLowerCase();
          setUser({
            username: data.username || data.email || "",
            name: data.name || data.nombre || "Usuario",
            role,
          });
        } catch {
          localStorage.removeItem("user");
          localStorage.removeItem("user_session");
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = (userData: User) => {
    const normalized = { ...userData, role: userData.role.toLowerCase() };
    localStorage.setItem("user", JSON.stringify(normalized)); // usa "user" como clave única
    localStorage.removeItem("user_session");
    setUser(normalized);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("user_session");
    setUser(null);
    router.push("/auth/login");
  };

  const hasRole = (requiredRole: string | string[]) => {
    if (!user) return false;
    const r = user.role.toLowerCase();
    const list = Array.isArray(requiredRole)
      ? requiredRole.map(x => x.toLowerCase())
      : [requiredRole.toLowerCase()];
    return list.includes(r);
  };

  const hasPermission = (_: string) => true;

  return { user, loading, login, logout, hasRole, hasPermission, isAuthenticated: !!user };
}
