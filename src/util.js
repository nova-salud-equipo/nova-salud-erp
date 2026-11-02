export const money = (n) => 'S/ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const r2 = (n) => Math.round(n * 100) / 100
export const fdate = (s) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}` }
export const fhora = (iso) => new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' })
export const fdia = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(iso))
export const hoyTexto = () => new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' })
export const hoyISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())

export function estadoProducto(p) {
  if (p.disponible <= 0) return { tone: 'red', texto: 'Agotado' }
  if (p.disponible < p.stockMinimo) return { tone: 'red', texto: 'Stock bajo' }
  if (p.lotes.some((l) => l.stock > 0 && l.dias < 0)) return { tone: 'neutral', texto: 'Lote vencido' }
  if (p.lotes.some((l) => l.stock > 0 && l.dias <= 30)) return { tone: 'amber', texto: 'Por vencer' }
  return { tone: 'green', texto: 'Normal' }
}

export function descargar(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + contenido], { type: tipo })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
}
