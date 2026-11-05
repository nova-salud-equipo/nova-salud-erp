import { useState } from 'react'
import { api } from '../api.js'
import { useCarga } from '../hooks.js'
import { useAuth } from '../auth.jsx'
import { Badge, Btn, Card, Chips, Estado, Kpi, Modal, useToast } from '../ui.jsx'
import { fdate, fdia, fhora, money } from '../util.js'

const TONO = { Pendiente: 'amber', Preparado: 'blue', Entregado: 'green', Cancelado: 'red' }
const FILTROS = ['Por atender', 'Pendiente', 'Preparado', 'Entregado', 'Cancelado', 'Todos']

export default function Pedidos({ onCambio }) {
  const toast = useToast()
  const { user } = useAuth()
  const gestiona = user.rol === 'Administrador' || user.rol === 'Cajero'
  const [f, setF] = useState('Por atender')
  const [cancelar, setCancelar] = useState(null)
  const [ocupado, setOcupado] = useState(null)
  // Se recarga cada 5 s para que los pedidos nuevos de la tienda aparezcan solos.
  const ped = useCarga('/pedidos', { cada: 5000 })
  if (!ped.data) return <Estado {...ped} onReintentar={ped.recargar} />

  const lista = ped.data.filter((p) => f === 'Todos' || (f === 'Por atender' ? ['Pendiente', 'Preparado'].includes(p.estado) : p.estado === f))
  const cuenta = (e) => ped.data.filter((p) => p.estado === e).length

  const mover = async (p, estado) => {
    setOcupado(p.id)
    try {
      const r = await api(`/pedidos/${p.id}/estado`, { method: 'PATCH', body: { estado } })
      toast(estado === 'Entregado' ? `Pedido ${p.codigo} entregado · boleta ${r.boleta}` : `Pedido ${p.codigo} ${estado.toLowerCase()}`)
      setCancelar(null)
      ped.recargar(); onCambio?.()
    } catch (e) { toast(e.message, 'warn') } finally { setOcupado(null) }
  }

  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Pendientes" value={cuenta('Pendiente')} icon="reloj" tone="amber" foot="Por preparar" />
        <Kpi label="Preparados" value={cuenta('Preparado')} icon="pedidos" tone="blue" foot="Listos para entregar" />
        <Kpi label="Entregados" value={cuenta('Entregado')} icon="check" tone="green" foot="Con boleta emitida" />
        <Kpi label="Monto por cobrar / entregar" value={money(ped.data.filter((p) => ['Pendiente', 'Preparado'].includes(p.estado)).reduce((s, p) => s + p.total, 0))} icon="cash" tone="teal" foot="Pedidos pendientes y preparados" />
      </div>
      <Card title="Pedidos de la tienda en línea" sub="El stock queda reservado hasta que el pedido se entrega o se cancela · se actualiza solo">
        <Chips options={FILTROS} value={f} onChange={setF} />
        {lista.length === 0 ? (
          <div className="empty" style={{ marginTop: 12 }}><b>No hay pedidos {f === 'Por atender' ? 'por atender' : 'en este estado'}</b><p className="muted">Cuando un cliente compre en la tienda web, su pedido aparecerá aquí automáticamente.</p></div>
        ) : lista.map((p) => (
          <div key={p.id} className={'ped' + (Date.now() - new Date(p.creado_en) < 15000 ? ' nuevo' : '')}>
            <div>
              <b>{p.codigo}</b> <Badge tone={TONO[p.estado]} dot>{p.estado}</Badge> {p.boleta && <Badge tone="neutral">Boleta {p.boleta}</Badge>}
              <small className="muted block">{fdate(fdia(p.creado_en))} {fhora(p.creado_en)} · {p.cliente} · {p.celular} · {p.entrega === 'recojo' ? 'Recojo en tienda' : 'Delivery: ' + p.direccion} · {p.metodo_pago}</small>
              <div className="ped-items">
                {p.items.map((i) => <Badge key={i.productoId} tone={i.contieneAine ? 'red' : i.requiereReceta ? 'amber' : 'teal'}>{i.cantidad} × {i.nombre}{i.requiereReceta ? ' (receta)' : ''}{i.contieneAine ? ' ⚠ AINE' : ''}</Badge>)}
              </div>
            </div>
            <div className="ped-acc">
              <b className="ped-total">{money(p.total)}</b>
              {gestiona && p.estado === 'Pendiente' && <Btn small disabled={ocupado === p.id} onClick={() => mover(p, 'Preparado')}>Marcar preparado</Btn>}
              {gestiona && p.estado === 'Preparado' && <Btn small disabled={ocupado === p.id} onClick={() => mover(p, 'Entregado')}>Entregar y emitir boleta</Btn>}
              {gestiona && ['Pendiente', 'Preparado'].includes(p.estado) && <Btn small kind="secondary" onClick={() => setCancelar(p)}>Cancelar</Btn>}
            </div>
          </div>
        ))}
      </Card>
      {cancelar && (
        <Modal title={`Cancelar pedido ${cancelar.codigo}`} onClose={() => setCancelar(null)}>
          <p>Se liberará el stock reservado y el cliente verá el pedido como cancelado. Esta acción no se puede deshacer.</p>
          <div className="modal-f"><Btn kind="secondary" onClick={() => setCancelar(null)}>Volver</Btn><Btn kind="danger" disabled={ocupado === cancelar.id} onClick={() => mover(cancelar, 'Cancelado')}>Cancelar pedido {cancelar.codigo}</Btn></div>
        </Modal>
      )}
    </div>
  )
}
