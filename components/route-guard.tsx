"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
  redirectTo?: string;
}

export function RouteGuard({
  children,
  requiredRole,
  requiredPermission,
  redirectTo = "/",
}: RouteGuardProps) {
  const { user, loading, hasRole, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(redirectTo);
      return;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      router.push("/unauthorized");
      return;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.push("/unauthorized");
      return;
    }
  }, [
    user,
    loading,
    requiredRole,
    requiredPermission,
    hasRole,
    hasPermission,
    router,
    redirectTo,
  ]);

  if (loading) {
    return (
      <div className="w-full h-[100vh] bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null;
  }

  return <>{children}</>;
}
