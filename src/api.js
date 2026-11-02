// Cliente HTTP del ERP. Toda la lógica de negocio vive en la API; aquí solo se llama.
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '') + '/api'
const KEY = 'novasalud-erp-sesion'

export const sesion = {
  leer() { try { return JSON.parse(sessionStorage.getItem(KEY)) } catch { return null } },
  guardar(s) { try { sessionStorage.setItem(KEY, JSON.stringify(s)) } catch { /* sin almacenamiento */ } },
  borrar() { try { sessionStorage.removeItem(KEY) } catch { /* sin almacenamiento */ } },
}

let alExpirar = () => {}
export const onSesionExpirada = (fn) => { alExpirar = fn }

export async function api(ruta, { method = 'GET', body } = {}) {
  const token = sesion.leer()?.token
  let r
  try {
    r = await fetch(BASE + ruta, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión o que la API esté encendida.')
  }
  const data = await r.json().catch(() => ({}))
  if (r.status === 401 && token) alExpirar()
  if (!r.ok) throw Object.assign(new Error(data.error || 'Ocurrió un error. Intenta de nuevo.'), { status: r.status })
  return data
}
