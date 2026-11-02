import { useState } from 'react'
import { useAuth } from '../auth.jsx'
import { Btn } from '../ui.jsx'

const DEMO = [['Administrador', 'admin@novasalud.pe', 'admin123'], ['Cajero', 'cajero@novasalud.pe', 'cajero123'], ['Almacén', 'almacen@novasalud.pe', 'almacen123']]

export default function Login() {
  const { login, aviso } = useAuth()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const entrar = async (e) => {
    e.preventDefault()
    if (!email.trim() || !pass) return setError('Escribe tu correo y tu contraseña.')
    setEnviando(true)
    try { await login(email.trim(), pass) } catch (err) { setError(err.message) } finally { setEnviando(false) }
  }

  return (
    <div className="login">
      <div className="login-brand">
        <div className="mark big">+</div>
        <h1>Nova Salud</h1>
        <p>Controla tu inventario, tus ventas y los pedidos de la tienda en línea en un solo lugar.</p>
        <ul>
          <li>Stock actualizado con cada venta y cada pedido web</li>
          <li>Alertas de reposición y de vencimiento</li>
          <li>Boletas y reportes en segundos</li>
        </ul>
      </div>
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={entrar}>
          <h2>Bienvenido de nuevo</h2>
          <p className="muted">Ingresa con tu cuenta de Nova Salud</p>
          {aviso && <div className="alert-err" role="status">{aviso}</div>}
          <label className="field">
            <span>Correo electrónico</span>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} autoComplete="username" />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" value={pass} onChange={(e) => { setPass(e.target.value); setError('') }} autoComplete="current-password" />
          </label>
          {error && <div className="alert-err" role="alert">{error}</div>}
          <Btn type="submit" className="full big" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</Btn>
          <p className="muted s center">Acceso solo para el personal de Nova Salud</p>
          {import.meta.env.VITE_MOSTRAR_DEMO !== 'false' && (
            <div className="demo-box">
              <b>Cuentas de prueba</b>
              <p className="muted s">Haz clic para completar los datos. Cada rol ve módulos distintos.</p>
              {DEMO.map(([rol, em, pw]) => (
                <button type="button" key={em} className="demo-user" onClick={() => { setEmail(em); setPass(pw); setError('') }}>
                  <span>{rol}</span><small>{em}</small>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
