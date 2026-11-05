import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { useCarga } from '../hooks.js'
import { Badge, Btn, Estado, Modal, useToast } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import { fdate, fdia, fhora, money, r2 } from '../util.js'

const METODOS = [
  { v: 'Efectivo', icon: 'cash' },
  { v: 'Yape / Plin', icon: 'movil' },
  { v: 'Tarjeta', icon: 'tarjeta' },
]

// Billetes sugeridos para cobrar en efectivo, siempre mayores o iguales al total.
function montosRapidos(total) {
  if (total <= 0) return []
  const out = [{ l: 'Exacto', v: total }]
  for (const b of [10, 20, 50, 100, 200]) {
    const v = Math.ceil(total / b) * b
    if (v > total && !out.some((o) => o.v === v)) out.push({ l: 'S/ ' + v, v })
    if (out.length === 4) break
  }
  return out
}

export default function Pos({ onCambio }) {
  const toast = useToast()
  const prod = useCarga('/productos')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Todos')
  const [carro, setCarro] = useState([]) // [{id,cant}]
  const [cliente, setCliente] = useState('')
  const [metodo, setMetodo] = useState('Efectivo')
  const [recibido, setRecibido] = useState('')
  const [receta, setReceta] = useState(false)
  const [boleta, setBoleta] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const inicio = useRef(null)
  const buscarRef = useRef(null)

  // Solo en escritorio: en móvil abriría el teclado sin pedirlo.
  useEffect(() => { if (window.matchMedia('(pointer: fine)').matches) buscarRef.current?.focus() }, [])

  const productos = prod.data || []
  const categorias = useMemo(() => {
    const m = new Map()
    productos.forEach((p) => m.set(p.categoria, (m.get(p.categoria) || 0) + 1))
    return [['Todos', productos.length], ...m.entries()]
  }, [productos])
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    return productos.filter((p) => (cat === 'Todos' || p.categoria === cat) && (!t || p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t)))
  }, [productos, q, cat])

  if (!prod.data) return <Estado {...prod} onReintentar={prod.recargar} />

  const buscar = (id) => productos.find((p) => p.id === id)
  const enCarro = (id) => carro.find((c) => c.id === id)?.cant || 0
  const lineas = carro.map((c) => ({ ...c, p: buscar(c.id) })).filter((l) => l.p)
  const unidades = lineas.reduce((s, l) => s + l.cant, 0)
  const total = r2(lineas.reduce((t, l) => t + l.cant * l.p.precioFinal, 0))
  const subtotal = r2(total / 1.18)
  const pideReceta = lineas.some((l) => l.p.requiereReceta)
  const vuelto = metodo === 'Efectivo' && recibido !== '' ? r2(Number(recibido) - total) : null
  const falta = vuelto !== null && vuelto < 0
  const listo = lineas.length > 0 && (!pideReceta || receta) && !falta && !enviando

  // Actualización funcional: varios clics seguidos no se pierden.
  const agregar = (p) => {
    if (p.disponible <= 0) return toast(p.nombre + ' está agotado', 'warn')
    if (enCarro(p.id) >= p.disponible) return toast(`Solo hay ${p.disponible} unidades disponibles de ${p.nombre}`, 'warn')
    if (!inicio.current) inicio.current = Date.now()
    setCarro((cs) => {
      const ya = cs.find((c) => c.id === p.id)
      if (ya && ya.cant >= p.disponible) return cs
      return ya ? cs.map((c) => (c.id === p.id ? { ...c, cant: c.cant + 1 } : c)) : [...cs, { id: p.id, cant: 1 }]
    })
  }
  const cambiar = (id, d) => {
    const p = buscar(id)
    if (d > 0 && enCarro(id) >= p.disponible) return toast(`Solo hay ${p.disponible} unidades disponibles`, 'warn')
    setCarro((cs) => cs.flatMap((c) => (c.id !== id ? [c] : c.cant + d <= 0 ? [] : [{ ...c, cant: c.cant + d }])))
  }
  const quitar = (id) => setCarro((cs) => cs.filter((c) => c.id !== id))
  const limpiar = () => { setCarro([]); setCliente(''); setRecibido(''); setReceta(false); setMetodo('Efectivo'); inicio.current = null }

  const alBuscar = (e) => {
    if (e.key === 'Enter' && lista.length === 1) { agregar(lista[0]); setQ('') }
    if (e.key === 'Escape') setQ('')
  }

  const cobrar = async () => {
    setEnviando(true)
    try {
      const segundos = inicio.current ? Math.max(20, Math.round((Date.now() - inicio.current) / 1000)) : null
      const v = await api('/ventas', { method: 'POST', body: { items: carro.map((c) => ({ productoId: c.id, cantidad: c.cant })), cliente: cliente.trim(), metodoPago: metodo, recetaVerificada: receta, segundosAtencion: segundos } })
      limpiar()
      setBoleta(v)
      toast('Venta registrada y stock actualizado')
      prod.recargar()
      onCambio?.()
    } catch (e) {
      toast(e.message, 'warn')
      prod.recargar()
    } finally { setEnviando(false) }
  }

  const motivo = pideReceta && !receta ? 'Confirma la receta médica para cobrar.' : falta ? 'El monto recibido no cubre el total.' : ''

  return (
    <div className="pos">
      <section className="pos-l" aria-label="Catálogo">
        <div className="pos-search">
          <Icon name="buscar" size={19} />
          <input ref={buscarRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={alBuscar}
            placeholder="Buscar por nombre o código…" aria-label="Buscar producto" autoComplete="off" spellCheck={false} />
          {q && <button className="pos-search-x" onClick={() => { setQ(''); buscarRef.current?.focus() }} aria-label="Limpiar búsqueda"><Icon name="x" size={16} /></button>}
          <span className="pos-search-n">{lista.length === 1 && q ? 'Enter para agregar' : `${lista.length} ${lista.length === 1 ? 'producto' : 'productos'}`}</span>
        </div>

        <div className="cats" role="tablist" aria-label="Categorías">
          {categorias.map(([c, n]) => (
            <button key={c} role="tab" aria-selected={cat === c} className={'cat' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>
              {c}<span>{n}</span>
            </button>
          ))}
        </div>

        {lista.length === 0 ? (
          <div className="empty"><b>No encontramos productos</b><p className="muted">Prueba con otro nombre o quita el filtro de categoría.</p><Btn kind="secondary" small onClick={() => { setQ(''); setCat('Todos') }}>Limpiar búsqueda</Btn></div>
        ) : (
          <div className="prod-grid">
            {lista.map((p) => {
              const n = enCarro(p.id)
              const agotado = p.disponible <= 0
              const bajo = !agotado && p.disponible < p.stockMinimo
              return (
                <button key={p.id} className={'prod' + (agotado ? ' off' : '') + (n ? ' in' : '')} onClick={() => agregar(p)} disabled={agotado}
                  aria-label={`${p.nombre}, ${money(p.precioFinal)}${n ? `, ${n} en la venta` : ''}`}>
                  {n > 0 && <span className="prod-n" aria-hidden="true">{n}</span>}
                  <div className="prod-top">
                    <small className="prod-code">{p.codigo}</small>
                    {p.requiereReceta && <Badge tone="amber">Receta</Badge>}
                    {p.enPromocion && <Badge tone="green">-20%</Badge>}
                  </div>
                  <b className="prod-name">{p.nombre}</b>
                  <small className="prod-pres">{p.presentacion}</small>
                  <div className="prod-bot">
                    <span className="price">{p.enPromocion && <s>{money(p.precio)}</s>}{money(p.precioFinal)}</span>
                    <span className={'stock' + (agotado ? ' red' : bajo ? ' amber' : '')}>
                      <i aria-hidden="true" />{agotado ? 'Agotado' : bajo ? `Quedan ${p.disponible}` : `${p.disponible} disp.`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <aside className="cart" aria-label="Venta actual">
        <header className="cart-h">
          <div>
            <h3>Venta actual</h3>
            <small className="muted">{unidades ? `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} · ${lineas.length} ${lineas.length === 1 ? 'producto' : 'productos'}` : 'Sin productos'}</small>
          </div>
          {carro.length > 0 && <button className="cart-clear" onClick={limpiar}><Icon name="basura" size={15} />Vaciar</button>}
        </header>

        <div className="cart-body">
          {lineas.length === 0 ? (
            <div className="cart-empty">
              <span className="cart-empty-ic"><Icon name="pos" size={24} /></span>
              <b>Agrega productos a la venta</b>
              <p className="muted">Toca un producto del catálogo o búscalo por nombre o código.</p>
            </div>
          ) : (
            <ul className="lines">
              {lineas.map((l) => (
                <li key={l.id} className="line">
                  <div className="line-tx">
                    <b>{l.p.nombre}</b>
                    <small className="muted">{money(l.p.precioFinal)} c/u{l.p.requiereReceta ? ' · Receta' : ''}</small>
                  </div>
                  <div className="qty">
                    <button onClick={() => cambiar(l.id, -1)} aria-label={'Quitar uno de ' + l.p.nombre}>−</button>
                    <span aria-live="polite">{l.cant}</span>
                    <button onClick={() => cambiar(l.id, 1)} aria-label={'Agregar uno de ' + l.p.nombre} disabled={l.cant >= l.p.disponible}>+</button>
                  </div>
                  <b className="line-t">{money(l.cant * l.p.precioFinal)}</b>
                  <button className="line-x" onClick={() => quitar(l.id)} aria-label={'Quitar ' + l.p.nombre + ' de la venta'}><Icon name="x" size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cart-foot">
          <label className="cart-client">
            <Icon name="usuario" size={16} />
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente: Público general" aria-label="Cliente (opcional)" />
          </label>

          <div className="pay" role="radiogroup" aria-label="Método de pago">
            {METODOS.map((m) => (
              <button key={m.v} role="radio" aria-checked={metodo === m.v} className={'pay-b' + (metodo === m.v ? ' on' : '')} onClick={() => setMetodo(m.v)}>
                <Icon name={m.icon} size={18} />{m.v}
              </button>
            ))}
          </div>

          {metodo === 'Efectivo' && lineas.length > 0 && (
            <div className="cash">
              <div className="cash-row">
                <label className="cash-in">
                  <span>Recibido</span>
                  <input type="number" inputMode="decimal" min="0" step="0.1" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder="0.00" aria-label="Monto recibido" />
                </label>
                <div className={'cash-out' + (falta ? ' bad' : vuelto !== null ? ' ok' : '')} aria-live="polite">
                  <span>{falta ? 'Falta' : 'Vuelto'}</span>
                  <b>{vuelto === null ? '—' : money(Math.abs(vuelto))}</b>
                </div>
              </div>
              <div className="cash-q">
                {montosRapidos(total).map((m) => (
                  <button key={m.l} className={'cash-q-b' + (Number(recibido) === m.v ? ' on' : '')} onClick={() => setRecibido(String(m.v))}>{m.l}</button>
                ))}
              </div>
            </div>
          )}

          {pideReceta && (
            <label className={'rx' + (receta ? ' ok' : '')}>
              <input type="checkbox" checked={receta} onChange={(e) => setReceta(e.target.checked)} />
              <Icon name="receta" size={17} />
              <span>Verifiqué la receta médica del cliente</span>
            </label>
          )}

          <div className="totals">
            <span>Subtotal <b>{money(subtotal)}</b></span>
            <span>IGV 18% <b>{money(total - subtotal)}</b></span>
          </div>
          <button className="charge" disabled={!listo} onClick={cobrar} aria-busy={enviando}>
            {enviando ? <><span className="spin" aria-hidden="true" />Registrando…</> : <><span className="charge-l">Cobrar<small>Total a pagar</small></span><b>{money(total)}</b></>}
          </button>
          {lineas.length > 0 && motivo && !enviando && <p className="charge-hint">{motivo}</p>}
        </div>
      </aside>

      {boleta && <Boleta v={boleta} onClose={() => setBoleta(null)} />}
    </div>
  )
}

export function Boleta({ v, onClose }) {
  return (
    <Modal title="Boleta de venta electrónica" onClose={onClose} width={420}>
      <div className="boleta">
        <div className="center"><b>NOVA SALUD</b><br /><small className="muted">Botica y farmacia · RUC 20601234567<br />Av. Principal 123, Lima</small></div>
        <div className="sep" />
        <div className="row-s"><span>N°</span><b>{v.numero}</b></div>
        <div className="row-s"><span>Fecha</span><span>{fdate(fdia(v.fecha))} {fhora(v.fecha)}</span></div>
        <div className="row-s"><span>Canal</span><span>{v.canal === 'web' ? 'Tienda web' : 'Mostrador'}</span></div>
        <div className="row-s"><span>Cliente</span><span>{v.cliente}</span></div>
        <div className="row-s"><span>Atendió</span><span>{v.usuario}</span></div>
        <div className="sep" />
        {v.items.map((i) => <div key={i.nombre} className="row-s"><span>{i.cantidad} × {i.nombre}</span><span>{money(i.cantidad * i.precio_unitario)}</span></div>)}
        <div className="sep" />
        <div className="row-s"><span>Subtotal</span><span>{money(v.subtotal)}</span></div>
        <div className="row-s"><span>IGV 18%</span><span>{money(v.igv)}</span></div>
        <div className="row-s grand"><b>TOTAL</b><b>{money(v.total)}</b></div>
        <div className="row-s"><span>Pago</span><span>{v.metodo_pago}</span></div>
        {v.estado === 'Anulada' && <div className="alert-err center">BOLETA ANULADA</div>}
        <p className="muted s center">¡Gracias por su compra! · Conserve su boleta</p>
      </div>
      <div className="modal-f"><Btn kind="secondary" onClick={() => window.print()}>Imprimir</Btn><Btn onClick={onClose}>Cerrar</Btn></div>
    </Modal>
  )
}
