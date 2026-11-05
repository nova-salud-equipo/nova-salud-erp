import { useState } from 'react'
import { api } from '../api.js'
import { useCarga } from '../hooks.js'
import { Badge, Btn, Card, Chips, Estado, Kpi, useToast } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import { Boleta } from './Pos.jsx'
import { descargar, fdate, fdia, fhora, hoyISO, money } from '../util.js'

const RANGOS = [{ value: '1', label: 'Hoy' }, { value: '7', label: 'Últimos 7 días' }, { value: '30', label: 'Últimos 30 días' }]

function Lista({ datos, fmt }) {
  if (!datos.length) return <p className="muted">Sin datos en este período.</p>
  const max = Math.max(...datos.map((d) => d.valor), 1)
  return (
    <div className="hbars">
      {datos.map((d) => (
        <div key={d.nombre} className="hb"><span className="hb-n">{d.nombre}</span><div className="hb-t"><div style={{ width: (d.valor / max) * 100 + '%' }} /></div><b>{fmt(d.valor)}</b></div>
      ))}
    </div>
  )
}

export default function Reportes({ onCambio }) {
  const toast = useToast()
  const [rango, setRango] = useState('7')
  const rep = useCarga('/reportes/ventas?dias=' + rango)
  const ventas = useCarga('/ventas?dias=' + rango)
  const [boleta, setBoleta] = useState(null)
  if (!rep.data) return <Estado {...rep} onReintentar={rep.recargar} />
  const { kpi } = rep.data
  const mm = Math.floor(kpi.segundos / 60), ss = String(Math.round(kpi.segundos % 60)).padStart(2, '0')

  const exportar = () => {
    const filas = [['Boleta', 'Fecha', 'Hora', 'Canal', 'Cliente', 'Metodo', 'Total', 'Estado']]
    ventas.data.forEach((v) => filas.push([v.numero, fdia(v.fecha), fhora(v.fecha), v.canal, v.cliente, v.metodo_pago, v.total.toFixed(2), v.estado]))
    descargar(`ventas-novasalud-${hoyISO()}.csv`, filas.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'))
  }
  const ver = async (id) => { try { setBoleta(await api('/ventas/' + id)) } catch (e) { toast(e.message, 'warn') } }
  const anular = async () => {
    try { const v = await api(`/ventas/${boleta.id}/anular`, { method: 'POST' }); setBoleta(v); toast('Venta anulada y stock devuelto'); rep.recargar(); ventas.recargar(); onCambio?.() } catch (e) { toast(e.message, 'warn') }
  }

  return (
    <div className="stack">
      <div className="toolbar between">
        <Chips options={RANGOS} value={rango} onChange={setRango} />
        <Btn kind="secondary" onClick={exportar} disabled={!ventas.data}><Icon name="descarga" size={16} />Exportar a Excel (CSV)</Btn>
      </div>
      <div className="kpis">
        <Kpi label="Ventas del período" value={money(kpi.total)} icon="cash" tone="teal" foot={RANGOS.find((x) => x.value === rango)?.label} />
        <Kpi label="Boletas emitidas" value={kpi.boletas} icon="boleta" tone="blue" foot={`${kpi.anuladas} ${kpi.anuladas === 1 ? 'anulada' : 'anuladas'}`} />
        <Kpi label="Ticket promedio" value={money(kpi.ticket)} icon="ticket" tone="green" foot="Por boleta pagada" />
        <Kpi label="Tiempo medio de atención" value={`${mm} min ${ss} s`} icon="reloj" tone={kpi.segundos <= 120 ? 'green' : 'amber'} foot="Meta: menos de 2 min" />
      </div>
      <div className="row3">
        <Card title="Productos más vendidos" sub="Unidades"><Lista datos={rep.data.top} fmt={(v) => v + ' u.'} /></Card>
        <Card title="Ventas por categoría"><Lista datos={rep.data.porCategoria} fmt={money} /></Card>
        <Card title="Mostrador vs. tienda web"><Lista datos={rep.data.porCanal.map((c) => ({ ...c, nombre: c.nombre === 'web' ? `Tienda web (${c.boletas})` : `Mostrador (${c.boletas})` }))} fmt={money} /></Card>
      </div>
      <Card title="Ventas por método de pago"><Lista datos={rep.data.porMetodo} fmt={money} /></Card>
      <Card title="Detalle de ventas" sub={ventas.data ? `${ventas.data.length} registros · clic en una fila para ver la boleta` : ''}>
        {!ventas.data ? <Estado {...ventas} /> : (
          <div className="tbl-wrap tall">
            <table className="tbl">
              <thead><tr><th>Boleta</th><th>Fecha</th><th>Hora</th><th>Canal</th><th>Cliente</th><th>Método</th><th className="r">Total</th><th>Estado</th></tr></thead>
              <tbody>
                {ventas.data.slice(0, 100).map((v) => (
                  <tr key={v.id} className="clic" onClick={() => ver(v.id)}><td>{v.numero}</td><td>{fdate(fdia(v.fecha))}</td><td>{fhora(v.fecha)}</td>
                    <td><Badge tone={v.canal === 'web' ? 'teal' : 'neutral'}>{v.canal === 'web' ? 'Web' : 'Mostrador'}</Badge></td>
                    <td>{v.cliente}</td><td>{v.metodo_pago}</td><td className="r">{money(v.total)}</td><td><Badge tone={v.estado === 'Pagada' ? 'green' : 'red'}>{v.estado}</Badge></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {boleta && (
        <>
          <Boleta v={boleta} onClose={() => setBoleta(null)} />
          {boleta.estado === 'Pagada' && <div className="anular-flot"><Btn kind="danger" onClick={anular}>Anular esta venta</Btn></div>}
        </>
      )}
    </div>
  )
}
