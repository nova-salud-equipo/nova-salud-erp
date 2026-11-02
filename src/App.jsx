import { useState } from 'react'
import { NavCtx } from './nav.js'
import { PERMISOS, useAuth } from './auth.jsx'
import { useCarga } from './hooks.js'
import { hoyTexto } from './util.js'
import { Badge, Btn, useToast } from './ui.jsx'
import Login from './screens/Login.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Pos from './screens/Pos.jsx'
import Pedidos from './screens/Pedidos.jsx'
import Inventario from './screens/Inventario.jsx'
import Alertas from './screens/Alertas.jsx'
import Compras from './screens/Compras.jsx'
import Reportes from './screens/Reportes.jsx'

const PANTALLAS = {
  Dashboard: [Dashboard, 'Dashboard', () => 'Resumen del día · ' + hoyTexto()],
  'Punto de venta': [Pos, 'Punto de venta', () => 'Busca, agrega y cobra en pocos pasos'],
  'Pedidos web': [Pedidos, 'Pedidos web', () => 'Pedidos hechos desde la tienda en línea'],
  Inventario: [Inventario, 'Inventario', () => 'Stock por producto y por lote, con fecha de vencimiento'],
  Alertas: [Alertas, 'Alertas de inventario', () => 'Reposición por stock bajo y control de vencimientos'],
  Compras: [Compras, 'Compras', () => 'Ingreso de mercadería con lote y fecha de vencimiento'],
  Reportes: [Reportes, 'Reportes', () => 'Ventas, productos más vendidos y métricas de atención'],
}

export default function App() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState('Dashboard')
  const [params, setParams] = useState(null)
  const [version, setVersion] = useState(0)
  // El menú se actualiza solo cada 10 s: así un pedido de la tienda aparece sin recargar.
  const { data: resumen } = useCarga(user ? `/reportes/resumen?v=${version}` : null, { cada: 10000 })

  if (!user) return <Login />

  const permitidas = PERMISOS[user.rol] || ['Dashboard']
  const actual = permitidas.includes(page) ? page : 'Dashboard'
  const [Pantalla, titulo, sub] = PANTALLAS[actual]
  const go = (p, prm = null) => { if (permitidas.includes(p)) { setPage(p); setParams(prm) } else toast('Tu rol no tiene acceso a ' + p, 'warn') }
  const refrescarMenu = () => setVersion((v) => v + 1)

  return (
    <NavCtx.Provider value={go}>
      <div className="app">
        <aside className="side">
          <div className="logo">
            <div className="mark">+</div>
            <div><b>Nova Salud</b><small>ERP interno</small></div>
          </div>
          <div className="menu-l">MENÚ</div>
          <nav>
            {Object.keys(PANTALLAS).map((n) => {
              const ok = permitidas.includes(n)
              const badge = n === 'Alertas' ? resumen?.alertas : n === 'Pedidos web' ? resumen?.pedidosPendientes : 0
              return (
                <button key={n} className={'nav' + (actual === n ? ' on' : '') + (ok ? '' : ' off')} onClick={() => go(n)} title={ok ? '' : 'Sin acceso para tu rol'}>
                  <i />
                  <span>{n}</span>
                  {badge > 0 && <Badge tone={n === 'Pedidos web' ? 'teal' : 'red'}>{badge}</Badge>}
                </button>
              )
            })}
          </nav>
          <div className="grow" />
          <div className="user">
            <div className="av">{user.nombre.split(' ').map((w) => w[0]).join('').slice(0, 2)}</div>
            <div><b>{user.nombre}</b><small>{user.rol}</small></div>
            <button className="out" onClick={logout} title="Cerrar sesión">Salir</button>
          </div>
        </aside>
        <main className="main">
          <header className="head">
            <div>
              <h1>{titulo}</h1>
              <p className="muted">{sub()}</p>
            </div>
            <div className="head-r">
              {actual !== 'Punto de venta' && permitidas.includes('Punto de venta') && <Btn onClick={() => go('Punto de venta')}>+ Nueva venta</Btn>}
            </div>
          </header>
          <Pantalla key={actual + JSON.stringify(params)} params={params} onCambio={refrescarMenu} />
        </main>
      </div>
    </NavCtx.Provider>
  )
}
