"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"

interface PermissionWrapperProps {
  children: React.ReactNode
  requiredRole?: string | string[]
  requiredPermission?: string
  fallback?: React.ReactNode
}

export function PermissionWrapper({
  children,
  requiredRole,
  requiredPermission,
  fallback = null,
}: PermissionWrapperProps) {
  const { hasRole, hasPermission } = useAuth()

  if (requiredRole && !hasRole(requiredRole)) {
    return <>{fallback}</>
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
