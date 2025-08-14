"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, User, Menu, X } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface NavbarProps {
  title: string
}

export function Navbar({ title }: NavbarProps) {
  const [user, setUser] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const userSession = localStorage.getItem("user_session")
    if (userSession) {
      setUser(JSON.parse(userSession))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("user_session")
    setIsMenuOpen(false)
    router.push("/")
  }

  const getRoleLabel = (role: string) => {
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-vtv-red text-white"
      case "master":
        return "bg-vtv-blue text-white"
      case "programacion":
        return "bg-vtv-green text-white"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <nav className="bg-gradient-to-r from-vtv-blue via-vtv-red to-vtv-cyan shadow-lg border-b fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Image
              src="/vtv-logo.png"
              alt="VTV Logo"
              width={32}
              height={32}
              className="object-contain sm:w-10 sm:h-10"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-xl font-bold text-white truncate" title={title}>
                {title}
              </h1>
              <p className="text-xs text-white/80 hidden sm:block">VTV Honduras</p>
            </div>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-2 text-sm text-white">
                <User className="h-4 w-4" />
                <span className="truncate max-w-32" title={user.name}>
                  {user.name}
                </span>
                <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${getRoleBadgeColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-white/90 border-white text-vtv-blue hover:bg-white hover:text-vtv-red transition-colors whitespace-nowrap"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Cerrar Sesión</span>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:bg-white/20 p-2"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20 bg-black/10 backdrop-blur-sm">
            {user && (
              <div className="flex flex-col space-y-2 text-sm text-white mb-4 px-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="truncate" title={user.name}>
                    {user.name}
                  </span>
                </div>
                <div className="flex justify-start">
                  <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              </div>
            )}
            <div className="px-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2 w-full justify-center bg-white/90 border-white text-vtv-blue hover:bg-white hover:text-vtv-red transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
