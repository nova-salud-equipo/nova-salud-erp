import { useEffect, useMemo, useRef, useState } from 'react'
import { NavCtx } from './nav.js'
import { PERMISOS, useAuth } from './auth.jsx'
import { useCarga } from './hooks.js'
import { hoyTexto } from './util.js'
import { Btn, useFueraYEsc, useToast } from './ui.jsx'
import { Icon, Marca } from './icons.jsx'
import Login from './screens/Login.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Pos from './screens/Pos.jsx'
import Pedidos from './screens/Pedidos.jsx'
import Inventario from './screens/Inventario.jsx'
import Alertas from './screens/Alertas.jsx'
import Compras from './screens/Compras.jsx'
import Reportes from './screens/Reportes.jsx'

// [componente, título, subtítulo, icono, descripción corta para el buscador]
const PANTALLAS = {
  Dashboard: [Dashboard, 'Dashboard', null, 'dashboard', 'Resumen del día'],
  'Punto de venta': [Pos, 'Punto de venta', () => 'Busca, agrega y cobra en pocos pasos', 'pos', 'Registrar una venta en mostrador'],
  'Pedidos web': [Pedidos, 'Pedidos web', () => 'Pedidos hechos desde la tienda en línea', 'pedidos', 'Preparar y entregar pedidos de la tienda'],
  Inventario: [Inventario, 'Inventario', () => 'Stock por producto y por lote, con fecha de vencimiento', 'inventario', 'Stock, lotes y kárdex'],
  Alertas: [Alertas, 'Alertas de inventario', () => 'Reposición por stock bajo y control de vencimientos', 'alertas', 'Stock bajo y vencimientos'],
  Compras: [Compras, 'Compras', () => 'Ingreso de mercadería con lote y fecha de vencimiento', 'compras', 'Registrar ingreso de mercadería'],
  Reportes: [Reportes, 'Reportes', () => 'Ventas, productos más vendidos y métricas de atención', 'reportes', 'Ventas, boletas y exportación'],
}

const GRUPOS = [
  ['General', ['Dashboard']],
  ['Ventas', ['Punto de venta', 'Pedidos web']],
  ['Almacén', ['Inventario', 'Alertas', 'Compras']],
  ['Gestión', ['Reportes']],
]
const grupoDe = (n) => GRUPOS.find(([, items]) => items.includes(n))?.[0]

const iniciales = (n = '') => n.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const saludo = () => {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Lima' }))
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}
const leerPref = () => { try { return localStorage.getItem('ns-menu') === 'mini' } catch { return false } }
const guardarPref = (mini) => { try { localStorage.setItem('ns-menu', mini ? 'mini' : 'full') } catch { /* sin almacenamiento */ } }

export default function App() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState('Dashboard')
  const [params, setParams] = useState(null)
  const [version, setVersion] = useState(0)
  const [mini, setMini] = useState(leerPref)
  const [buscador, setBuscador] = useState(false)
  // El menú se actualiza solo cada 10 s: así un pedido de la tienda aparece sin recargar.
  const { data: resumen, error: sinConexion } = useCarga(user ? `/reportes/resumen?v=${version}` : null, { cada: 10000 })

  useEffect(() => {
    if (!user) return
    const f = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setBuscador((v) => !v) } }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [user])

  if (!user) return <Login />

  const permitidas = PERMISOS[user.rol] || ['Dashboard']
  const actual = permitidas.includes(page) ? page : 'Dashboard'
  const [Pantalla, titulo, sub] = PANTALLAS[actual]
  const go = (p, prm = null) => {
    if (!permitidas.includes(p)) return toast('Tu rol no tiene acceso a ' + p, 'warn')
    setPage(p); setParams(prm); setBuscador(false)
    window.scrollTo({ top: 0 })
  }
  const refrescarMenu = () => setVersion((v) => v + 1)
  const contador = (n) => (n === 'Alertas' ? resumen?.alertas : n === 'Pedidos web' ? resumen?.pedidosPendientes : 0)
  const alternarMenu = () => setMini((m) => { guardarPref(!m); return !m })
  const subtitulo = actual === 'Dashboard' ? `${saludo()}, ${user.nombre.split(' ')[0]} · ${hoyTexto()}` : sub()

  return (
    <NavCtx.Provider value={go}>
      <div className={'app' + (mini ? ' mini' : '')}>
        <aside className="side">
          <div className="brand">
            <Marca size={34} />
            <div className="brand-tx"><b>Nova Salud</b><small>ERP · Botica</small></div>
          </div>

          <nav className="side-nav" aria-label="Módulos">
            {GRUPOS.map(([grupo, items]) => {
              const visibles = items.filter((n) => permitidas.includes(n))
              if (!visibles.length) return null
              return (
                <div key={grupo} className="nav-group">
                  <span className="nav-group-t">{grupo}</span>
                  {visibles.map((n) => {
                    const c = contador(n)
                    return (
                      <button key={n} className={'nav' + (actual === n ? ' on' : '')} onClick={() => go(n)} aria-current={actual === n ? 'page' : undefined} title={mini ? n : undefined}>
                        <Icon name={PANTALLAS[n][3]} size={19} />
                        <span className="nav-t">{n}</span>
                        {c > 0 && <span className={'nav-c' + (n === 'Alertas' ? ' red' : '')} aria-label={`${c} pendientes`}>{c}</span>}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </nav>

          <div className="side-foot">
            <div className="side-user">
              <div className="av" aria-hidden="true">{iniciales(user.nombre)}</div>
              <div className="side-user-tx"><b>{user.nombre}</b><small>{user.rol}</small></div>
            </div>
            <button className="side-toggle" onClick={alternarMenu} aria-label={mini ? 'Expandir menú' : 'Contraer menú'} title={mini ? 'Expandir menú' : 'Contraer menú'}>
              <Icon name={mini ? 'expandir' : 'contraer'} size={18} />
              <span>Contraer menú</span>
            </button>
          </div>
        </aside>

        <div className="main-col">
          <header className="topbar">
            <div className="crumbs" aria-label="Ubicación">
              <span>Nova Salud</span>
              <Icon name="chevron" size={13} />
              <span>{grupoDe(actual)}</span>
              <Icon name="chevron" size={13} />
              <span className="here">{titulo}</span>
            </div>
            <div className="topbar-r">
              <button className="cmd" onClick={() => setBuscador(true)} aria-label="Buscar módulo (Ctrl+K)">
                <Icon name="buscar" size={16} /><span>Buscar módulo…</span><kbd>Ctrl K</kbd>
              </button>
              <span className={'live' + (sinConexion ? ' off' : '')} role="status" title={sinConexion ? 'Sin conexión con el servidor' : 'Los datos se actualizan solos'}>
                <i aria-hidden="true" /><span>{sinConexion ? 'Sin conexión' : 'En línea'}</span>
              </span>
              <Notificaciones resumen={resumen} permitidas={permitidas} go={go} sinConexion={!!sinConexion} />
              <MenuUsuario user={user} logout={logout} />
            </div>
          </header>
          <main className="main">
            {actual !== 'Punto de venta' && <div className="page-head">
              <div className="page-head-t">
                <h1>{titulo}</h1>
                <p>{subtitulo}</p>
              </div>
              {actual !== 'Punto de venta' && permitidas.includes('Punto de venta') && (
                <Btn onClick={() => go('Punto de venta')}><Icon name="plus" size={16} />Nueva venta</Btn>
              )}
            </div>}
            <div className="screen" key={actual + JSON.stringify(params)}>
              <Pantalla params={params} onCambio={refrescarMenu} />
            </div>
          </main>
        </div>

        {buscador && <Buscador permitidas={permitidas} go={go} onClose={() => setBuscador(false)} />}
      </div>
    </NavCtx.Provider>
  )
}

function Notificaciones({ resumen, permitidas, go, sinConexion }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  useFueraYEsc(ref, abierto, () => setAbierto(false))
  const items = []
  if (permitidas.includes('Pedidos web') && resumen?.pedidosPendientes > 0) items.push({ ir: 'Pedidos web', icon: 'pedidos', tone: 'blue', t: `${resumen.pedidosPendientes} ${resumen.pedidosPendientes === 1 ? 'pedido web por atender' : 'pedidos web por atender'}`, d: 'Prepáralos y entrégalos desde Pedidos web' })
  if (permitidas.includes('Alertas') && resumen?.stockBajo > 0) items.push({ ir: 'Alertas', icon: 'stockBajo', tone: 'red', t: `${resumen.stockBajo} ${resumen.stockBajo === 1 ? 'producto con stock bajo' : 'productos con stock bajo'}`, d: 'Conviene registrar una compra' })
  if (permitidas.includes('Alertas') && resumen?.porVencer > 0) items.push({ ir: 'Alertas', icon: 'reloj', tone: 'amber', t: `${resumen.porVencer} ${resumen.porVencer === 1 ? 'lote por vencer o vencido' : 'lotes por vencer o vencidos'}`, d: 'Rótalos, promociónalos o dalos de baja' })
  const total = items.length
  return (
    <div className="pop-wrap" ref={ref}>
      <button className={'top-ic' + (abierto ? ' on' : '')} onClick={() => setAbierto((v) => !v)} aria-label={`Notificaciones${total ? ` (${total})` : ''}`} aria-expanded={abierto}>
        <Icon name="alertas" size={19} />
        {total > 0 && <span className="top-dot" aria-hidden="true" />}
      </button>
      <div className={'pop right' + (abierto ? ' on' : '')} role="dialog" aria-label="Notificaciones">
        <div className="pop-h"><b>Notificaciones</b>{total > 0 && <span className="muted s">{total} pendientes</span>}</div>
        {sinConexion && <div className="pop-empty">No se pudo consultar el servidor.</div>}
        {!sinConexion && total === 0 && <div className="pop-empty"><Icon name="check" size={18} />Todo al día, no hay pendientes.</div>}
        {items.map((it) => (
          <button key={it.t} className="pop-row" onClick={() => { setAbierto(false); go(it.ir) }}>
            <span className={'al-ic ' + it.tone}><Icon name={it.icon} size={16} /></span>
            <span className="pop-row-tx"><b>{it.t}</b><small>{it.d}</small></span>
            <Icon name="chevron" size={14} />
          </button>
        ))}
      </div>
    </div>
  )
}

function MenuUsuario({ user, logout }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  useFueraYEsc(ref, abierto, () => setAbierto(false))
  return (
    <div className="pop-wrap" ref={ref}>
      <button className={'user-btn' + (abierto ? ' on' : '')} onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} aria-label="Menú de usuario">
        <span className="av sm" aria-hidden="true">{iniciales(user.nombre)}</span>
        <Icon name="abajo" size={15} />
      </button>
      <div className={'pop right' + (abierto ? ' on' : '')} role="dialog" aria-label="Cuenta">
        <div className="pop-user">
          <span className="av" aria-hidden="true">{iniciales(user.nombre)}</span>
          <div><b>{user.nombre}</b><small>{user.email}</small></div>
        </div>
        <div className="pop-sep" />
        <div className="pop-info"><span>Rol</span><b>{user.rol}</b></div>
        <div className="pop-info"><span>Módulos</span><b>{(PERMISOS[user.rol] || []).length} de 7</b></div>
        <div className="pop-sep" />
        <button className="pop-row danger" onClick={logout}><Icon name="logout" size={17} /><span className="pop-row-tx"><b>Cerrar sesión</b></span></button>
      </div>
    </div>
  )
}

// Paleta de comandos (Ctrl+K): salta a cualquier módulo permitido.
function Buscador({ permitidas, go, onClose }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const opciones = useMemo(() => {
    const t = q.trim().toLowerCase()
    return permitidas
      .map((n) => ({ n, icon: PANTALLAS[n][3], d: PANTALLAS[n][4], g: grupoDe(n) }))
      .filter((o) => !t || o.n.toLowerCase().includes(t) || o.d.toLowerCase().includes(t) || o.g.toLowerCase().includes(t))
  }, [q, permitidas])
  const tecla = (e) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, opciones.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && opciones[sel]) go(opciones[sel].n)
  }
  return (
    <div className="cmd-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmd-box" role="dialog" aria-label="Buscar módulo">
        <div className="cmd-in">
          <Icon name="buscar" size={18} />
          <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setSel(0) }} onKeyDown={tecla} placeholder="Ir a un módulo…" aria-label="Buscar módulo" role="combobox" aria-expanded="true" aria-controls="cmd-list" autoComplete="off" spellCheck={false} />
          <kbd>Esc</kbd>
        </div>
        <div className="cmd-list" id="cmd-list" role="listbox">
          {opciones.length === 0 && <div className="pop-empty">Ningún módulo coincide con “{q}”.</div>}
          {opciones.map((o, i) => (
            <button key={o.n} role="option" aria-selected={i === sel} className={'cmd-row' + (i === sel ? ' on' : '')} onMouseEnter={() => setSel(i)} onClick={() => go(o.n)}>
              <span className="cmd-ic"><Icon name={o.icon} size={17} /></span>
              <span className="pop-row-tx"><b>{o.n}</b><small>{o.d}</small></span>
              <span className="cmd-g">{o.g}</span>
            </button>
          ))}
        </div>
        <div className="cmd-f"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span></div>
      </div>
    </div>
  )
}
