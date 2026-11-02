import { useState } from 'react'
import { api } from '../api.js'
import { useCarga } from '../hooks.js'
import { Badge, Btn, Card, Estado, Field, useToast } from '../ui.jsx'
import { fdate, hoyISO, money } from '../util.js'

const vacia = (productoId = '') => ({ productoId: String(productoId), lote: '', vence: '', cantidad: '', costo: '' })

export default function Compras({ params, onCambio }) {
  const toast = useToast()
  const prod = useCarga('/productos')
  const provs = useCarga('/compras/proveedores')
  const hist = useCarga('/compras')
  const [proveedorId, setProveedorId] = useState('')
  const [factura, setFactura] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [lineas, setLineas] = useState([vacia(params?.productoId || '')])
  const [intento, setIntento] = useState(false)
  const [enviando, setEnviando] = useState(false)
  if (!prod.data || !provs.data) return <Estado {...(prod.error ? prod : provs)} onReintentar={() => { prod.recargar(); provs.recargar() }} />

  const hoy = hoyISO()
  const set = (i, k, v) => setLineas(lineas.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  const errLinea = (l) => ({
    productoId: !l.productoId ? 'Elige un producto.' : '',
    lote: l.lote.trim().length < 2 ? 'Ingresa el N° de lote.' : '',
    vence: !l.vence ? 'Ingresa la fecha.' : l.vence <= hoy ? 'Debe vencer después de hoy.' : '',
    cantidad: !(Number(l.cantidad) > 0) || !Number.isInteger(Number(l.cantidad)) ? 'Cantidad inválida.' : '',
    costo: !(Number(l.costo) > 0) ? 'Costo inválido.' : '',
  })
  const errCab = { proveedorId: !proveedorId ? 'Elige el proveedor.' : '', factura: factura.trim().length < 3 ? 'Ingresa el N° de factura del proveedor.' : '' }
  const todoOk = Object.values(errCab).every((e) => !e) && lineas.every((l) => Object.values(errLinea(l)).every((e) => !e))
  const total = lineas.reduce((t, l) => t + (Number(l.cantidad) || 0) * (Number(l.costo) || 0), 0)

  const registrar = async () => {
    setIntento(true)
    if (!todoOk) return toast('Revisa los campos marcados antes de registrar', 'warn')
    setEnviando(true)
    try {
      await api('/compras', { method: 'POST', body: { proveedorId: Number(proveedorId), factura: factura.trim(), fecha, lineas: lineas.map((l) => ({ productoId: Number(l.productoId), lote: l.lote.trim(), vence: l.vence, cantidad: Number(l.cantidad), costo: Number(l.costo) })) } })
      toast('Compra registrada: el stock se actualizó')
      setFactura(''); setLineas([vacia()]); setIntento(false)
      hist.recargar(); prod.recargar(); onCambio?.()
    } catch (e) { toast(e.message, 'warn') } finally { setEnviando(false) }
  }

  return (
    <div className="stack">
      <Card title="Registrar ingreso de mercadería" sub="Cada producto entra con su lote y fecha de vencimiento">
        <div className="three-f">
          <Field label="Proveedor" error={intento && errCab.proveedorId}><select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}><option value="">Elegir proveedor…</option>{provs.data.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}</select></Field>
          <Field label="N° de factura" error={intento && errCab.factura}><input value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="F001-004512" /></Field>
          <Field label="Fecha de ingreso"><input type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} /></Field>
        </div>
        <div className="tbl-wrap">
          <table className="tbl form-t">
            <thead><tr><th>Producto</th><th>Lote</th><th>Vence</th><th>Cantidad</th><th>Costo unit. (S/)</th><th className="r">Subtotal</th><th /></tr></thead>
            <tbody>
              {lineas.map((l, i) => {
                const e = intento ? errLinea(l) : {}
                return (
                  <tr key={i}>
                    <td><select className={e.productoId ? 'bad' : ''} value={l.productoId} onChange={(ev) => set(i, 'productoId', ev.target.value)} aria-label="Producto"><option value="">Elegir producto…</option>{prod.data.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>{e.productoId && <em className="err">{e.productoId}</em>}</td>
                    <td><input className={e.lote ? 'bad' : ''} value={l.lote} onChange={(ev) => set(i, 'lote', ev.target.value)} placeholder="L2611-A" aria-label="Lote" />{e.lote && <em className="err">{e.lote}</em>}</td>
                    <td><input type="date" className={e.vence ? 'bad' : ''} value={l.vence} min={hoy} onChange={(ev) => set(i, 'vence', ev.target.value)} aria-label="Fecha de vencimiento" />{e.vence && <em className="err">{e.vence}</em>}</td>
                    <td><input type="number" className={e.cantidad ? 'bad' : ''} value={l.cantidad} onChange={(ev) => set(i, 'cantidad', ev.target.value)} aria-label="Cantidad" />{e.cantidad && <em className="err">{e.cantidad}</em>}</td>
                    <td><input type="number" step="0.01" className={e.costo ? 'bad' : ''} value={l.costo} onChange={(ev) => set(i, 'costo', ev.target.value)} aria-label="Costo unitario" />{e.costo && <em className="err">{e.costo}</em>}</td>
                    <td className="r">{money((Number(l.cantidad) || 0) * (Number(l.costo) || 0))}</td>
                    <td className="r">{lineas.length > 1 && <button className="link" onClick={() => setLineas(lineas.filter((_, j) => j !== i))}>Quitar</button>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="form-f">
          <Btn kind="secondary" onClick={() => setLineas([...lineas, vacia()])}>+ Agregar producto</Btn>
          <div className="grow" />
          <div className="tot-c"><span className="muted">Total de la compra</span><b>{money(total)}</b></div>
          <Btn onClick={registrar} disabled={enviando}>{enviando ? 'Registrando…' : 'Registrar compra'}</Btn>
        </div>
      </Card>

      <Card title="Historial de compras">
        {!hist.data ? <Estado {...hist} /> : hist.data.length === 0 ? <p className="muted">Aún no hay compras registradas. Las nuevas aparecerán aquí.</p> : (
          <table className="tbl">
            <thead><tr><th>N°</th><th>Fecha</th><th>Proveedor</th><th>Factura</th><th>Detalle</th><th className="r">Total</th></tr></thead>
            <tbody>
              {hist.data.map((c) => (
                <tr key={c.id}><td>C-{String(c.id).padStart(4, '0')}</td><td>{fdate(c.fecha)}</td><td>{c.proveedor}</td><td>{c.numero_factura}</td>
                  <td>{c.lineas.map((l, i) => <Badge key={i} tone="teal">{l.cantidad} × {l.producto} ({l.lote})</Badge>)}</td>
                  <td className="r">{money(c.total)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
