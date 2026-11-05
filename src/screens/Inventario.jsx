import { useMemo, useState } from 'react'
import { api } from '../api.js'
import { useCarga } from '../hooks.js'
import { useAuth } from '../auth.jsx'
import { Badge, Btn, Card, Chips, Estado, Field, Kpi, Modal, useToast } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import { estadoProducto, fdate, fdia, fhora, money } from '../util.js'

const ESTADOS = ['Todos', 'Normal', 'Stock bajo', 'Por vencer', 'Agotado']

export default function Inventario({ params, onCambio }) {
  const toast = useToast()
  const { user } = useAuth()
  const puedeEditar = user.rol === 'Administrador' || user.rol === 'Almacén'
  const prod = useCarga('/productos')
  const movs = useCarga('/productos/movimientos?limite=8')
  const [q, setQ] = useState(params?.q || '')
  const [cat, setCat] = useState('Todos')
  const [est, setEst] = useState('Todos')
  const [abierto, setAbierto] = useState(params?.productoId || null)
  const [ajuste, setAjuste] = useState(null)
  const [nuevo, setNuevo] = useState(false)

  const productos = prod.data || []
  const categorias = useMemo(() => ['Todos', ...new Set(productos.map((p) => p.categoria))], [productos])
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    return productos.filter((p) => (cat === 'Todos' || p.categoria === cat) && (est === 'Todos' || estadoProducto(p).texto === est) &&
      (!t || p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t)))
  }, [productos, q, cat, est])
  if (!prod.data) return <Estado {...prod} onReintentar={prod.recargar} />

  const recargar = () => { prod.recargar(); movs.recargar(); onCambio?.() }
  const promo = async (p) => {
    try { await api(`/productos/${p.id}`, { method: 'PATCH', body: { enPromocion: !p.enPromocion } }); toast(p.enPromocion ? 'Promoción quitada' : 'Promoción -20% activada (también en la tienda web)'); recargar() } catch (e) { toast(e.message, 'warn') }
  }

  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Productos registrados" value={productos.length} icon="inventario" tone="teal" foot={`${categorias.length - 1} categorías`} />
        <Kpi label="Unidades en almacén" value={productos.reduce((s, p) => s + p.stockTotal, 0).toLocaleString('en-US')} icon="caja" tone="blue" foot="Suma de todos los lotes" />
        <Kpi label="Reservadas por pedidos web" value={productos.reduce((s, p) => s + p.reservado, 0)} icon="pedidos" tone="amber" foot="Hasta entregar o cancelar" />
        <Kpi label="Valor a precio de venta" value={money(productos.reduce((s, p) => s + p.vigente * p.precio, 0))} icon="cash" tone="green" foot="Solo lotes vigentes" />
      </div>

      <Card title="Inventario de productos" action={puedeEditar && <Btn onClick={() => setNuevo(true)}><Icon name="plus" size={16} />Nuevo producto</Btn>}>
        <div className="toolbar"><input className="search" placeholder="Buscar por nombre o código" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en inventario" /></div>
        <Chips options={categorias} value={cat} onChange={setCat} />
        <div className="gap" />
        <Chips options={ESTADOS} value={est} onChange={setEst} />
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th className="r">Disponible</th><th className="r">Reservado</th><th className="r">Mín.</th><th>Próx. vencimiento</th><th className="r">Precio</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan="10"><div className="empty small"><b>Sin resultados</b><p className="muted">Ningún producto coincide con los filtros.</p><Btn kind="secondary" small onClick={() => { setQ(''); setCat('Todos'); setEst('Todos') }}>Limpiar filtros</Btn></div></td></tr>}
              {lista.map((p) => {
                const e = estadoProducto(p)
                const pv = p.lotes.find((l) => l.stock > 0)
                return [
                  <tr key={p.id} className="clic" onClick={() => setAbierto(abierto === p.id ? null : p.id)}>
                    <td className="num muted">{p.codigo}</td>
                    <td><b>{p.nombre}</b> {p.requiereReceta && <Badge tone="amber">Receta</Badge>} {p.enPromocion && <Badge tone="green">Promo</Badge>}<small className="muted block">{p.presentacion}</small></td>
                    <td>{p.categoria}</td>
                    <td className="r"><b>{p.disponible}</b></td>
                    <td className="r">{p.reservado || '—'}</td>
                    <td className="r">{p.stockMinimo}</td>
                    <td>{pv ? fdate(pv.vence) : '—'}{pv && pv.dias <= 30 && <small className="muted block">{pv.dias < 0 ? 'vencido' : `en ${pv.dias} días`}</small>}</td>
                    <td className="r">{money(p.precioFinal)}</td>
                    <td><Badge tone={e.tone} dot>{e.texto}</Badge></td>
                    <td className="r"><span className="chev">{abierto === p.id ? '▲' : '▼'}</span></td>
                  </tr>,
                  abierto === p.id && (
                    <tr key={p.id + 'd'} className="detalle"><td colSpan="10">
                      <div className="det">
                        <div><b>Lotes de {p.nombre}</b><small className="muted block">Proveedor: {p.proveedor || '—'} · Se vende primero el lote que vence antes (FEFO)</small></div>
                        {p.lotes.length === 0 ? <p className="muted">Sin lotes. Registra una compra para cargar stock.</p> : (
                          <table className="tbl inner">
                            <thead><tr><th>Lote</th><th>Vence</th><th className="r">Stock</th><th>Estado</th><th /></tr></thead>
                            <tbody>
                              {p.lotes.map((l) => (
                                <tr key={l.id}>
                                  <td>{l.numero}</td><td>{fdate(l.vence)}</td><td className="r">{l.stock}</td>
                                  <td>{l.dias < 0 ? <Badge tone="red">Vencido</Badge> : l.dias <= 30 ? <Badge tone="amber">Vence en {l.dias} días</Badge> : <Badge tone="green">Vigente</Badge>}</td>
                                  <td className="r">{puedeEditar && <Btn kind="secondary" small onClick={() => setAjuste({ p, l })}>Ajustar</Btn>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {user.rol === 'Administrador' && <Btn kind="secondary" small onClick={() => promo(p)}>{p.enPromocion ? 'Quitar promoción' : 'Activar promoción -20%'}</Btn>}
                      </div>
                    </td></tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Últimos movimientos (kárdex)" sub="Entradas, salidas y ajustes registrados">
        {movs.data?.length === 0 ? <p className="muted">Todavía no hay movimientos.</p> : (
          <table className="tbl">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Lote</th><th className="r">Cant.</th><th>Motivo</th><th>Usuario</th></tr></thead>
            <tbody>
              {movs.data?.map((m) => (
                <tr key={m.id}>
                  <td>{fdate(fdia(m.fecha))} {fhora(m.fecha)}</td>
                  <td><Badge tone={m.tipo === 'ENTRADA' ? 'green' : m.tipo === 'SALIDA' ? 'neutral' : 'amber'}>{m.tipo}</Badge></td>
                  <td>{m.producto}</td><td>{m.lote}</td><td className="r">{m.cantidad > 0 ? '+' : ''}{m.cantidad}</td><td>{m.motivo}</td><td>{m.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {ajuste && <Ajuste {...ajuste} onClose={() => setAjuste(null)} onListo={() => { setAjuste(null); recargar() }} />}
      {nuevo && <NuevoProducto onClose={() => setNuevo(false)} onListo={() => { setNuevo(false); recargar() }} />}
    </div>
  )
}

function Ajuste({ p, l, onClose, onListo }) {
  const toast = useToast()
  const [valor, setValor] = useState(String(l.stock))
  const [motivo, setMotivo] = useState('Conteo físico')
  const [tocado, setTocado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const n = Number(valor)
  const error = valor === '' || !Number.isInteger(n) || n < 0 ? 'Ingresa un número entero de 0 o más.' : ''
  const guardar = async () => {
    setEnviando(true)
    try { await api(`/productos/lotes/${l.id}/ajuste`, { method: 'POST', body: { nuevoStock: n, motivo } }); toast('Stock del lote ' + l.numero + ' actualizado'); onListo() } catch (e) { toast(e.message, 'warn') } finally { setEnviando(false) }
  }
  return (
    <Modal title="Ajustar stock del lote" onClose={onClose}>
      <p className="muted">{p.nombre} · Lote {l.numero}</p>
      <Field label="Nuevo stock del lote" error={tocado && error} hint={`Stock actual: ${l.stock}`}>
        <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={() => setTocado(true)} autoFocus />
      </Field>
      <Field label="Motivo del ajuste">
        <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          {['Conteo físico', 'Merma o deterioro', 'Producto dañado', 'Error de registro'].map((m) => <option key={m}>{m}</option>)}
        </select>
      </Field>
      <div className="modal-f"><Btn kind="secondary" onClick={onClose}>Cancelar</Btn><Btn disabled={!!error || enviando} onClick={guardar}>Guardar ajuste</Btn></div>
    </Modal>
  )
}

function NuevoProducto({ onClose, onListo }) {
  const toast = useToast()
  const cats = useCarga('/catalogo/categorias')
  const provs = useCarga('/compras/proveedores')
  const [f, setF] = useState({ nombre: '', categoriaId: '', presentacion: '', precio: '', stockMinimo: '10', requiereReceta: false, proveedorId: '' })
  const [t, setT] = useState({})
  const [enviando, setEnviando] = useState(false)
  const set = (k, v) => setF({ ...f, [k]: v })
  const err = {
    nombre: f.nombre.trim().length < 3 ? 'Escribe el nombre del producto (mínimo 3 letras).' : '',
    categoriaId: !f.categoriaId ? 'Elige una categoría.' : '',
    precio: !(Number(f.precio) > 0) ? 'Ingresa un precio mayor a 0.' : '',
    stockMinimo: f.stockMinimo === '' || !(Number(f.stockMinimo) >= 0) ? 'Ingresa el stock mínimo.' : '',
  }
  const ok = Object.values(err).every((e) => !e)
  const blur = (k) => setT({ ...t, [k]: true })
  const guardar = async () => {
    setEnviando(true)
    try {
      await api('/productos', { method: 'POST', body: { ...f, categoriaId: Number(f.categoriaId), proveedorId: f.proveedorId ? Number(f.proveedorId) : null, precio: Number(f.precio), stockMinimo: Number(f.stockMinimo) } })
      toast('Producto creado. Registra su primera compra para cargar stock.'); onListo()
    } catch (e) { toast(e.message, 'warn') } finally { setEnviando(false) }
  }
  return (
    <Modal title="Nuevo producto" onClose={onClose} width={520}>
      <Field label="Nombre del producto" error={t.nombre && err.nombre}><input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} onBlur={() => blur('nombre')} autoFocus /></Field>
      <div className="two">
        <Field label="Categoría" error={t.categoriaId && err.categoriaId}><select value={f.categoriaId} onChange={(e) => set('categoriaId', e.target.value)} onBlur={() => blur('categoriaId')}><option value="">Elegir…</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
        <Field label="Proveedor"><select value={f.proveedorId} onChange={(e) => set('proveedorId', e.target.value)}><option value="">Sin proveedor</option>{provs.data?.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}</select></Field>
      </div>
      <Field label="Presentación" hint="Ej. Caja x 20 tabletas"><input value={f.presentacion} onChange={(e) => set('presentacion', e.target.value)} /></Field>
      <div className="two">
        <Field label="Precio de venta (S/)" error={t.precio && err.precio}><input type="number" step="0.1" value={f.precio} onChange={(e) => set('precio', e.target.value)} onBlur={() => blur('precio')} /></Field>
        <Field label="Stock mínimo" error={t.stockMinimo && err.stockMinimo}><input type="number" value={f.stockMinimo} onChange={(e) => set('stockMinimo', e.target.value)} onBlur={() => blur('stockMinimo')} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={f.requiereReceta} onChange={(e) => set('requiereReceta', e.target.checked)} /> Requiere receta médica</label>
      <div className="modal-f"><Btn kind="secondary" onClick={onClose}>Cancelar</Btn><Btn disabled={!ok || enviando} onClick={guardar}>Crear producto</Btn></div>
    </Modal>
  )
}
