"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { getToken, checkActiveSession } from "@/lib/auth.services";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  redirectTo?: string;
}

export function RouteGuard({
  children,
  requiredRole,
  redirectTo = "/",
}: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [verifying, setVerifying] = useState(true);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!mounted || loading) return;

      // 1) Debe existir token válido
      let token: string | null = null;
      try { token = await getToken(); } catch { token = null; }
      if (cancelled) return;

      if (!token) {
        if (pathname !== redirectTo) router.replace(redirectTo);
        setVerifying(false);
        return;
      }

      // 2) Validación de rol (si se pidió)
      if (requiredRole) {
        const allowed = (Array.isArray(requiredRole) ? requiredRole : [requiredRole])
          .map(r => r.toString().toLowerCase());

        let role = user?.role?.toString().toLowerCase();

        // Fallback: claims de Firebase por si aún no hidrató useAuth
        if (!role) {
          try {
            const s = await checkActiveSession();
            role = (s?.rol?.rol as string | undefined)?.toLowerCase();
          } catch {/* ignore */}
        }

        if (!role || !allowed.includes(role)) {
          if (pathname !== "/unauthorized") router.replace("/unauthorized");
          setVerifying(false);
          return;
        }
      }

      setVerifying(false);
    })();
    return () => { cancelled = true; };
  }, [mounted, loading, user?.role, requiredRole, router, pathname, redirectTo]);

  if (!mounted || loading || verifying) {
    return (
      <div className="w-full bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </div>
    );
  }

  return <>{children}</>;
}
