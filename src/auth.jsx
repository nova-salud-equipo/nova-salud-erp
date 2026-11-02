import { createContext, useContext, useEffect, useState } from 'react'
import { api, onSesionExpirada, sesion } from './api.js'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => sesion.leer()?.usuario || null)
  const [aviso, setAviso] = useState('')
  useEffect(() => onSesionExpirada(() => { sesion.borrar(); setUser(null); setAviso('Tu sesión expiró. Vuelve a iniciar sesión.') }), [])
  const login = async (email, password) => {
    const r = await api('/auth/login', { method: 'POST', body: { email, password } })
    sesion.guardar(r)
    setAviso('')
    setUser(r.usuario)
  }
  const logout = () => { sesion.borrar(); setUser(null) }
  return <Ctx.Provider value={{ user, login, logout, aviso }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)

// Solo controla qué menús se ven; la API vuelve a validar cada permiso.
export const PERMISOS = {
  Administrador: ['Dashboard', 'Punto de venta', 'Pedidos web', 'Inventario', 'Alertas', 'Compras', 'Reportes'],
  Cajero: ['Dashboard', 'Punto de venta', 'Pedidos web', 'Inventario'],
  'Almacén': ['Dashboard', 'Inventario', 'Alertas', 'Compras'],
}
