"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
  redirectTo?: string; // usa tu login real, p. ej. "/auth/login"
}

export function RouteGuard({
  children,
  requiredRole,
  requiredPermission,
  redirectTo = "/auth/login",
}: RouteGuardProps) {
  const { user, loading, hasRole, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Para evitar parpadeos de SSR/CSR
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Si ya hay algo en localStorage pero todavía no se reflejó en useAuth,
  // esperamos antes de decidir.
  const persistedUserRaw = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("user");
  }, []);

  const waitingForHydration =
    !mounted || loading || (!!persistedUserRaw && !user);

  // Sólo decidimos redirecciones cuando NO estamos esperando hidratación
  useEffect(() => {
    if (waitingForHydration) return;

    // Sin usuario -> a login (evitar redirect a la misma ruta)
    if (!user) {
      if (pathname !== redirectTo) {
        router.replace(`${redirectTo}?from=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // Reglas de rol
    if (requiredRole && !hasRole(requiredRole)) {
      if (pathname !== "/unauthorized") {
        router.replace(`/unauthorized?from=${encodeURIComponent(pathname)}&need=${
          Array.isArray(requiredRole)
            ? encodeURIComponent(`role:${requiredRole.join("|")}`)
            : encodeURIComponent(`role:${requiredRole}`)
        }`);
      }
      return;
    }

    // Reglas de permiso
    if (requiredPermission && !hasPermission(requiredPermission)) {
      if (pathname !== "/unauthorized") {
        router.replace(
          `/unauthorized?from=${encodeURIComponent(pathname)}&need=${encodeURIComponent(
            `perm:${requiredPermission}`
          )}`
        );
      }
    }
  }, [
    waitingForHydration,
    user,
    requiredRole,
    requiredPermission,
    hasRole,
    hasPermission,
    router,
    pathname,
    redirectTo,
  ]);

  // Mientras hidrata → spinner (sin redirecciones)
  if (waitingForHydration) {
    return (
      <div className="w-full h-[100vh] bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  // Si llegó aquí, ya hubo decisión arriba (o está autorizado)
  if (!user) return null;
  if (requiredRole && !hasRole(requiredRole)) return null;
  if (requiredPermission && !hasPermission(requiredPermission)) return null;

  return <>{children}</>;
}
