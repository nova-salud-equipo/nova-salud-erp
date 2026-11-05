import { useCarga } from '../hooks.js'
import { useNav } from '../nav.js'
import { PERMISOS, useAuth } from '../auth.jsx'
import { Badge, Btn, Card, Estado, Kpi } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import { fhora, hoyISO, money } from '../util.js'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const TIPO = {
  'Stock bajo': { tone: 'red', icon: 'stockBajo' },
  'Por vencer': { tone: 'amber', icon: 'reloj' },
  Vencido: { tone: 'red', icon: 'alerta' },
}
const ACCIONES = [
  { ir: 'Punto de venta', icon: 'pos', t: 'Nueva venta', d: 'Cobrar en mostrador' },
  { ir: 'Pedidos web', icon: 'pedidos', t: 'Atender pedidos', d: 'Pedidos de la tienda' },
  { ir: 'Compras', icon: 'compras', t: 'Registrar compra', d: 'Ingreso de mercadería' },
  { ir: 'Inventario', icon: 'inventario', t: 'Consultar stock', d: 'Productos y lotes' },
  { ir: 'Alertas', icon: 'alertas', t: 'Revisar alertas', d: 'Stock y vencimientos' },
  { ir: 'Reportes', icon: 'reportes', t: 'Ver reportes', d: 'Ventas y exportación' },
]
const corto = (n) => 'S/ ' + Math.round(n).toLocaleString('en-US')

export default function Dashboard() {
  const go = useNav()
  const { user } = useAuth()
  const r = useCarga('/reportes/resumen', { cada: 10000 })
  const al = useCarga('/reportes/alertas', { cada: 10000 })
  const puedeVentas = user.rol !== 'Almacén'
  const puedeAlertas = user.rol !== 'Cajero'
  const ventas = useCarga(puedeVentas ? '/ventas?dias=1' : null, { cada: 10000 })
  if (!r.data) return <Estado {...r} onReintentar={r.recargar} />
  const { hoy, dias } = r.data
  const max = Math.max(...dias.map((d) => d.total), 1)
  const totalSemana = dias.reduce((s, d) => s + d.total, 0)
  const promedio = totalSemana / (dias.length || 1)
  const alertas = al.data || []
  const acciones = ACCIONES.filter((x) => (PERMISOS[user.rol] || []).includes(x.ir))

  return (
    <div className="stack">
      <div className={'kpis' + (puedeVentas ? '' : ' three')}>
        {puedeVentas && <>
        <Kpi label="Ventas de hoy" value={money(hoy.total)} icon="cash" tone="teal"
          foot={<span>{hoy.boletas} {hoy.boletas === 1 ? 'boleta emitida' : 'boletas emitidas'}</span>} />
        <Kpi label="Pedidos web por atender" value={r.data.pedidosPendientes} icon="pedidos" tone="blue"
          foot={<span>{money(hoy.web)} vendidos por web hoy</span>} onClick={() => go('Pedidos web')} />
        </>}
        <Kpi label="Productos con stock bajo" value={r.data.stockBajo} icon="stockBajo" tone="red"
          foot={<span>{r.data.stockBajo ? 'Conviene reponer pronto' : 'Stock en orden'}</span>} onClick={puedeAlertas ? () => go('Alertas') : undefined} />
        <Kpi label="Lotes por vencer o vencidos" value={r.data.porVencer} icon="reloj" tone="amber"
          foot={<span>{r.data.porVencer ? 'Revisar y rotar' : 'Sin vencimientos cercanos'}</span>} onClick={puedeAlertas ? () => go('Alertas') : undefined} />
        {!puedeVentas && (
          <Kpi label="Alertas activas" value={alertas.length} icon="alertas" tone="teal"
            foot={<span>Stock bajo, por vencer y vencidos</span>} onClick={() => go('Alertas')} />
        )}
      </div>

      <section className="quick" aria-label="Accesos rápidos" style={{ '--n': acciones.length }}>
        {acciones.map((x) => (
          <button key={x.ir} className="quick-b" onClick={() => go(x.ir)}>
            <span className="quick-ic"><Icon name={x.icon} size={18} /></span>
            <span className="quick-tx"><b>{x.t}</b><small>{x.d}</small></span>
          </button>
        ))}
      </section>

      <div className={puedeVentas ? 'row2' : 'stack'}>
        {puedeVentas && <Card title="Ventas de los últimos 7 días" className="chart-card">
          <div className="chart-sum">
            <div><span className="muted s">Total de la semana</span><b>{money(totalSemana)}</b></div>
            <div><span className="muted s">Promedio diario</span><b>{money(promedio)}</b></div>
          </div>
          <div className="bars" role="img" aria-label={'Ventas por día: ' + dias.map((d) => `${DIAS[new Date(d.fecha + 'T12:00:00').getDay()]} ${money(d.total)}`).join(', ')}>
            <div className="bars-avg" style={{ bottom: 28 + (promedio / max) * 160 }}><span>Prom.</span></div>
            {dias.map((d) => {
              const esHoy = d.fecha === hoyISO()
              return (
                <div key={d.fecha} className={'bar-col' + (esHoy ? ' hoy' : '')}>
                  <span className="bar-v">{corto(d.total)}</span>
                  <div className="bar" style={{ height: Math.max(4, (d.total / max) * 160) }} />
                  <span className="bar-d">{esHoy ? 'Hoy' : DIAS[new Date(d.fecha + 'T12:00:00').getDay()]}</span>
                </div>
              )
            })}
          </div>
        </Card>}

        <Card title="Alertas recientes" sub={alertas.length ? `${alertas.length} activas` : undefined}
          action={puedeAlertas && alertas.length > 0 && <Btn kind="secondary" small onClick={() => go('Alertas')}>Ver todas</Btn>}>
          {al.data && alertas.length === 0 && (
            <div className="ok-state"><span className="ok-ic"><Icon name="check" /></span><div><b>Todo en orden</b><p className="muted s">No hay alertas de stock ni de vencimiento.</p></div></div>
          )}
          <div className="al-list">
            {alertas.slice(0, 5).map((a) => {
              const t = TIPO[a.tipo] || TIPO.Vencido
              return (
                <div key={a.id} className="al-item">
                  <span className={'al-ic ' + t.tone}><Icon name={t.icon} size={16} /></span>
                  <div className="grow-1">
                    <div className="al-top"><b>{a.producto}</b><Badge tone={t.tone}>{a.tipo}</Badge></div>
                    <small className="muted">{a.detalle}</small>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {puedeVentas && (
        <Card title="Últimas ventas de hoy" sub={ventas.data ? `${ventas.data.length} ${ventas.data.length === 1 ? 'venta' : 'ventas'} registradas hoy` : undefined}
          action={user.rol === 'Administrador' && <Btn kind="secondary" small onClick={() => go('Reportes')}>Ver reportes</Btn>}>
          {ventas.data?.length === 0 ? (
            <div className="empty small"><b>Aún no hay ventas hoy</b><p className="muted">Las ventas del mostrador y de la tienda web aparecerán aquí.</p></div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>N° de boleta</th><th>Hora</th><th>Canal</th><th>Cliente</th><th>Método de pago</th><th className="r">Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {ventas.data?.slice(0, 6).map((v) => (
                    <tr key={v.id}>
                      <td className="num"><b>{v.numero}</b></td><td className="num muted">{fhora(v.fecha)}</td>
                      <td><Badge tone={v.canal === 'web' ? 'teal' : 'neutral'}>{v.canal === 'web' ? 'Web' : 'Mostrador'}</Badge></td>
                      <td className="cut">{v.cliente}</td><td>{v.metodo_pago}</td><td className="r num"><b>{money(v.total)}</b></td>
                      <td><Badge tone={v.estado === 'Pagada' ? 'green' : 'red'} dot>{v.estado}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
