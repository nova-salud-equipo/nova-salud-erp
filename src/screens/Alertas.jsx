import { useState } from 'react'
import { api } from '../api.js'
import { useCarga } from '../hooks.js'
import { useNav } from '../nav.js'
import { useAuth } from '../auth.jsx'
import { Badge, Btn, Card, Chips, Estado, Kpi, Modal, useToast } from '../ui.jsx'
import { Icon } from '../icons.jsx'

const TONO = { 'Stock bajo': 'red', 'Por vencer': 'amber', Vencido: 'red' }
const ICONO = { 'Stock bajo': 'stockBajo', 'Por vencer': 'reloj', Vencido: 'alerta' }

export default function Alertas({ onCambio }) {
  const go = useNav()
  const toast = useToast()
  const { user } = useAuth()
  const al = useCarga('/reportes/alertas')
  const prod = useCarga('/productos')
  const [f, setF] = useState('Todas')
  const [baja, setBaja] = useState(null)
  if (!al.data) return <Estado {...al} onReintentar={al.recargar} />
  const todas = al.data
  const cuenta = (t) => todas.filter((a) => a.tipo === t).length
  const lista = f === 'Todas' ? todas : todas.filter((a) => a.tipo === f)
  const enPromo = (id) => prod.data?.find((p) => p.id === id)?.enPromocion
  const recargar = () => { al.recargar(); prod.recargar(); onCambio?.() }

  const promocionar = async (a) => {
    try { await api(`/productos/${a.productoId}`, { method: 'PATCH', body: { enPromocion: true } }); toast('Promoción -20% activada en ' + a.producto + ' (visible en la tienda web)'); recargar() } catch (e) { toast(e.message, 'warn') }
  }
  const darDeBaja = async () => {
    try { await api(`/productos/lotes/${baja.loteId}/ajuste`, { method: 'POST', body: { nuevoStock: 0, motivo: 'Baja por vencimiento', tipo: 'BAJA' } }); toast('Lote dado de baja'); setBaja(null); recargar() } catch (e) { toast(e.message, 'warn') }
  }

  const accion = (a) => {
    if (a.tipo === 'Stock bajo') return <Btn small onClick={() => go('Compras', { productoId: a.productoId })}>Reponer</Btn>
    if (a.tipo === 'Por vencer') {
      if (enPromo(a.productoId)) return <Badge tone="green">En promoción</Badge>
      return user.rol === 'Administrador' ? <Btn small kind="secondary" onClick={() => promocionar(a)}>Poner en promoción</Btn> : null
    }
    return <Btn small kind="danger" onClick={() => setBaja(a)}>Dar de baja</Btn>
  }

  return (
    <div className="stack">
      <div className="kpis three">
        <Kpi label="Stock bajo" value={cuenta('Stock bajo')} icon="stockBajo" tone="red" foot="Debajo del stock mínimo" />
        <Kpi label="Por vencer (30 días)" value={cuenta('Por vencer')} icon="reloj" tone="amber" foot="Conviene rotar o promocionar" />
        <Kpi label="Vencidos con stock" value={cuenta('Vencido')} icon="alerta" tone="red" foot="Dar de baja del inventario" />
      </div>
      <Card title="Alertas activas" sub="Se calculan solas con cada venta, pedido web, compra o ajuste">
        <Chips options={[{ value: 'Todas', label: `Todas (${todas.length})` }, { value: 'Stock bajo', label: 'Stock bajo' }, { value: 'Por vencer', label: 'Por vencer' }, { value: 'Vencido', label: 'Vencidos' }]} value={f} onChange={setF} />
        {lista.length === 0 ? (
          <div className="empty" style={{ marginTop: 12 }}><b>Todo en orden</b><p className="muted">No hay alertas de este tipo.</p></div>
        ) : (
          <div className="alist">
            {lista.map((a) => (
              <div key={a.id} className="arow">
                <span className={'al-ic ' + (TONO[a.tipo] === 'amber' ? 'amber' : 'red')}><Icon name={ICONO[a.tipo] || 'alerta'} size={16} /></span>
                <div className="grow-1"><b>{a.producto}</b> <Badge tone={TONO[a.tipo]}>{a.tipo}</Badge><small className="muted block">{a.detalle}</small></div>
                <Btn kind="ghost" small onClick={() => go('Inventario', { productoId: a.productoId, q: a.producto })}>Ver en inventario</Btn>
                {accion(a)}
              </div>
            ))}
          </div>
        )}
      </Card>
      {baja && (
        <Modal title="Dar de baja lote vencido" onClose={() => setBaja(null)}>
          <p>{baja.producto}: {baja.detalle}. El stock de este lote pasará a 0 y quedará registrado en el kárdex.</p>
          <div className="modal-f"><Btn kind="secondary" onClick={() => setBaja(null)}>Cancelar</Btn><Btn kind="danger" onClick={darDeBaja}>Dar de baja el lote</Btn></div>
        </Modal>
      )}
    </div>
  )
}
