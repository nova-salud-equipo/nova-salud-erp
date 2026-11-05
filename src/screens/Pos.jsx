import { useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { useCarga } from '../hooks.js'
import { Badge, Btn, Chips, Estado, Modal, useToast } from '../ui.jsx'
import { fdate, fdia, fhora, money, r2 } from '../util.js'

const METODOS = ['Efectivo', 'Yape / Plin', 'Tarjeta']

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

  const productos = prod.data || []
  const categorias = useMemo(() => ['Todos', ...new Set(productos.map((p) => p.categoria))], [productos])
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    return productos.filter((p) => (cat === 'Todos' || p.categoria === cat) && (!t || p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t)))
  }, [productos, q, cat])

  if (!prod.data) return <Estado {...prod} onReintentar={prod.recargar} />

  const buscar = (id) => productos.find((p) => p.id === id)
  const lineas = carro.map((c) => ({ ...c, p: buscar(c.id) })).filter((l) => l.p)
  const total = r2(lineas.reduce((t, l) => t + l.cant * l.p.precioFinal, 0))
  const subtotal = r2(total / 1.18)
  const pideReceta = lineas.some((l) => l.p.requiereReceta)
  const conAine = lineas.filter((l) => l.p.contieneAine)
  const vuelto = metodo === 'Efectivo' && recibido !== '' ? r2(Number(recibido) - total) : null
  const falta = vuelto !== null && vuelto < 0
  const listo = lineas.length > 0 && (!pideReceta || receta) && !falta && !enviando

  const agregar = (p) => {
    const ya = carro.find((c) => c.id === p.id)?.cant || 0
    if (p.disponible <= 0) return toast(p.nombre + ' está agotado', 'warn')
    if (ya >= p.disponible) return toast(`Solo hay ${p.disponible} unidades disponibles de ${p.nombre}`, 'warn')
    if (!inicio.current) inicio.current = Date.now()
    setCarro(ya ? carro.map((c) => (c.id === p.id ? { ...c, cant: c.cant + 1 } : c)) : [...carro, { id: p.id, cant: 1 }])
  }
  const cambiar = (id, d) => {
    const p = buscar(id)
    setCarro(carro.flatMap((c) => {
      if (c.id !== id) return [c]
      const n = c.cant + d
      if (n <= 0) return []
      if (n > p.disponible) { toast(`Solo hay ${p.disponible} unidades disponibles`, 'warn'); return [c] }
      return [{ ...c, cant: n }]
    }))
  }
  const limpiar = () => { setCarro([]); setCliente(''); setRecibido(''); setReceta(false); setMetodo('Efectivo'); inicio.current = null }

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

  return (
    <div className="pos">
      <div className="pos-l">
        <div className="toolbar">
          <input className="search" placeholder="Buscar por nombre o código (ej. paracetamol)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar producto" />
        </div>
        <Chips options={categorias} value={cat} onChange={setCat} />
        {lista.length === 0 && <div className="empty"><b>No encontramos productos</b><p className="muted">Prueba con otro nombre o quita el filtro de categoría.</p><Btn kind="secondary" small onClick={() => { setQ(''); setCat('Todos') }}>Limpiar búsqueda</Btn></div>}
        <div className="prod-grid">
          {lista.map((p) => (
            <button key={p.id} className={'prod' + (p.disponible <= 0 ? ' off' : '')} onClick={() => agregar(p)} disabled={p.disponible <= 0}>
              <div className="prod-top"><small className="muted">{p.codigo}</small>{p.contieneAine && <Badge tone="red">⚠ AINE</Badge>}{p.requiereReceta && <Badge tone="amber">Receta</Badge>}{p.enPromocion && <Badge tone="green">-20%</Badge>}</div>
              <b>{p.nombre}</b>
              <small className="muted">{p.presentacion}</small>
              <div className="prod-bot">
                <span className="price">{p.enPromocion && <s>{money(p.precio)}</s>} {money(p.precioFinal)}</span>
                <Badge tone={p.disponible <= 0 ? 'red' : p.disponible < p.stockMinimo ? 'amber' : 'neutral'}>{p.disponible <= 0 ? 'Agotado' : p.disponible + ' disp.'}</Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      <aside className="cart">
        <div className="cart-h"><h3>Venta actual</h3>{carro.length > 0 && <button className="link" onClick={limpiar}>Vaciar</button>}</div>
        {lineas.length === 0 ? (
          <div className="empty small"><b>Aún no agregas productos</b><p className="muted">Toca un producto de la lista para añadirlo a la venta.</p></div>
        ) : (
          <div className="lines">
            {lineas.map((l) => (
              <div key={l.id} className="line">
                <div><b>{l.p.nombre}</b> {l.p.contieneAine && <Badge tone="red">AINE</Badge>}<small className="muted">{money(l.p.precioFinal)} c/u</small></div>
                <div className="qty">
                  <button onClick={() => cambiar(l.id, -1)} aria-label={'Quitar uno de ' + l.p.nombre}>−</button>
                  <span>{l.cant}</span>
                  <button onClick={() => cambiar(l.id, 1)} aria-label={'Agregar uno de ' + l.p.nombre}>+</button>
                </div>
                <b className="r">{money(l.cant * l.p.precioFinal)}</b>
              </div>
            ))}
          </div>
        )}
        <label className="field"><span>Cliente (opcional)</span><input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Público general" /></label>
        <div className="field"><span>Método de pago</span><Chips options={METODOS} value={metodo} onChange={setMetodo} /></div>
        {metodo === 'Efectivo' && lineas.length > 0 && (
          <label className="field"><span>Monto recibido</span>
            <input type="number" min="0" step="0.1" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder={money(total)} />
            {falta ? <em className="err">Falta {money(-vuelto)} para cubrir el total.</em> : vuelto !== null ? <em className="ok">Vuelto: {money(vuelto)}</em> : null}
          </label>
        )}
        {conAine.length > 0 && <div className="alert-warn" role="alert">⚠ {conAine.map((l) => l.p.nombre).join(', ')} {conAine.length === 1 ? 'contiene' : 'contienen'} AINE. Pregunta al cliente si es alérgico a los antiinflamatorios antes de cobrar.</div>}
        {pideReceta && <label className="check"><input type="checkbox" checked={receta} onChange={(e) => setReceta(e.target.checked)} /> Verifiqué la receta médica del cliente</label>}
        <div className="totals">
          <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div><span>IGV (18%)</span><span>{money(total - subtotal)}</span></div>
          <div className="grand"><span>Total</span><span>{money(total)}</span></div>
        </div>
        <Btn className="full big" disabled={!listo} onClick={cobrar}>{enviando ? 'Registrando…' : `Cobrar ${total > 0 ? money(total) : ''}`}</Btn>
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
