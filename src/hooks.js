import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

// Carga datos de la API y permite recargarlos. cada = recarga automática en ms.
export function useCarga(ruta, { cada } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const recargar = useCallback(async () => {
    if (!ruta) return
    try { setData(await api(ruta)); setError(null) } catch (e) { setError(e.message) }
  }, [ruta])
  useEffect(() => {
    recargar()
    if (!cada) return
    const id = setInterval(recargar, cada)
    return () => clearInterval(id)
  }, [recargar, cada])
  return { data, error, cargando: data === null && !error, recargar }
}
