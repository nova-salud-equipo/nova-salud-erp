import { useCarga } from '../hooks.js'
import { useNav } from '../nav.js'
import { useAuth } from '../auth.jsx'
import { Badge, Btn, Card, Estado } from '../ui.jsx'
import { fhora, hoyISO, money } from '../util.js'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function Dashboard() {
  const go = useNav()
  const { user } = useAuth()
  const r = useCarga('/reportes/resumen', { cada: 10000 })
  const al = useCarga('/reportes/alertas', { cada: 10000 })
  const puedeVentas = user.rol !== 'Almacén'
  const ventas = useCarga(puedeVentas ? '/ventas?dias=1' : null, { cada: 10000 })
  if (!r.data) return <Estado {...r} onReintentar={r.recargar} />
  const { hoy, dias } = r.data
  const max = Math.max(...dias.map((d) => d.total), 1)
  const totalSemana = dias.reduce((s, d) => s + d.total, 0)

  return (
    <div className="stack">
      <div className="kpis">
        <Card className="kpi"><span className="muted s">Ventas de hoy</span><b>{money(hoy.total)}</b><Badge tone="green">{hoy.boletas} boletas</Badge></Card>
        <Card className="kpi clic" onClick={() => go('Pedidos web')}><span className="muted s">Pedidos web por atender</span><b>{r.data.pedidosPendientes}</b><Badge tone="teal">{money(hoy.web)} vendidos por web hoy</Badge></Card>
        <Card className="kpi clic" onClick={() => go('Alertas')}><span className="muted s">Stock bajo</span><b>{r.data.stockBajo} productos</b><Badge tone="red">Reponer pronto</Badge></Card>
        <Card className="kpi clic" onClick={() => go('Alertas')}><span className="muted s">Por vencer / vencidos</span><b>{r.data.porVencer} lotes</b><Badge tone="amber">Revisar y rotar</Badge></Card>
      </div>

      <div className="row2">
        <Card title="Ventas de los últimos 7 días" sub={money(totalSemana)}>
          <div className="bars">
            {dias.map((d) => (
              <div key={d.fecha} className="bar-col" title={money(d.total)}>
                <small className="muted">{money(d.total).split('.')[0]}</small>
                <div className={'bar' + (d.fecha === hoyISO() ? ' hoy' : '')} style={{ height: Math.max(6, (d.total / max) * 150) }} />
                <b className="s">{DIAS[new Date(d.fecha + 'T12:00:00').getDay()]}</b>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Alertas recientes" action={<Btn kind="secondary" small onClick={() => go('Alertas')}>Ver todas</Btn>}>
          {al.data?.length === 0 && <p className="muted">Todo en orden: no hay alertas.</p>}
          {al.data?.slice(0, 5).map((a) => (
            <div key={a.id} className="al-item">
              <i className={'dot ' + (a.tipo === 'Por vencer' ? 'amber' : 'red')} />
              <div><b>{a.producto}</b><small className="muted">{a.detalle}</small></div>
            </div>
          ))}
        </Card>
      </div>

      {puedeVentas && (
        <Card title="Últimas ventas de hoy" action={user.rol === 'Administrador' && <Btn kind="secondary" small onClick={() => go('Reportes')}>Ver reportes</Btn>}>
          {ventas.data?.length === 0 ? <p className="muted">Aún no hay ventas hoy.</p> : (
            <table className="tbl">
              <thead><tr><th>N° de boleta</th><th>Hora</th><th>Canal</th><th>Cliente</th><th>Método de pago</th><th className="r">Total</th><th>Estado</th></tr></thead>
              <tbody>
                {ventas.data?.slice(0, 6).map((v) => (
                  <tr key={v.id}>
                    <td>{v.numero}</td><td>{fhora(v.fecha)}</td>
                    <td><Badge tone={v.canal === 'web' ? 'teal' : 'neutral'}>{v.canal === 'web' ? 'Web' : 'Mostrador'}</Badge></td>
                    <td>{v.cliente}</td><td>{v.metodo_pago}</td><td className="r">{money(v.total)}</td>
                    <td><Badge tone={v.estado === 'Pagada' ? 'green' : 'red'}>{v.estado}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  )
}
