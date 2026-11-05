import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth.jsx'

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
)
const I = {
  stock: <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  receipt: <><path d="M5 3v18l2.5-1.5L10 21l2-1.5 2 1.5 2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5 5 3Z" /><path d="M9 9h6M9 13h6" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" /><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
}

// Cruz de farmacia dibujada, no un glifo de texto.
function Marca({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="marca">
      <rect width="40" height="40" rx="11" fill="currentColor" />
      <path d="M16.5 9.5h7v7h7v7h-7v7h-7v-7h-7v-7h7z" fill="var(--marca-cruz, #fff)" />
    </svg>
  )
}

export default function Login() {
  const { login, aviso } = useAuth()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [mayus, setMayus] = useState(false)
  const [error, setError] = useState('')
  const [campo, setCampo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const emailRef = useRef(null)
  const passRef = useRef(null)

  // Solo en escritorio: en móvil abriría el teclado sin pedirlo.
  useEffect(() => { if (window.matchMedia('(pointer: fine)').matches) emailRef.current?.focus() }, [])

  const entrar = async (e) => {
    e.preventDefault()
    setCampo('')
    if (!email.trim()) { setError('Escribe tu correo electrónico.'); setCampo('email'); return emailRef.current?.focus() }
    if (!pass) { setError('Escribe tu contraseña.'); setCampo('pass'); return passRef.current?.focus() }
    setEnviando(true)
    try { await login(email.trim(), pass) } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión. Inténtalo de nuevo.')
      passRef.current?.select()
    } finally { setEnviando(false) }
  }

  const revisarMayus = (e) => setMayus(e.getModifierState?.('CapsLock') || false)

  return (
    <div className="login">
      <aside className="login-brand">
        <div className="login-brand-top">
          <Marca size={40} />
          <span className="login-brand-name">Nova Salud</span>
        </div>

        <div className="login-brand-body">
          <h1>El mostrador y la tienda en línea, sobre el mismo stock.</h1>
          <ul className="login-points">
            <li><span className="pt-ic"><Icon d={I.stock} /></span><div><b>Inventario por lotes</b><p>Se descuenta con cada venta y cada pedido web.</p></div></li>
            <li><span className="pt-ic"><Icon d={I.bell} /></span><div><b>Alertas a tiempo</b><p>Reposición y productos por vencer.</p></div></li>
            <li><span className="pt-ic"><Icon d={I.receipt} /></span><div><b>Boletas y reportes</b><p>Listos al momento de cobrar.</p></div></li>
          </ul>
        </div>

        <p className="login-brand-foot">Botica Nova Salud · Panel interno</p>
      </aside>

      <main className="login-form-wrap">
        <form className="login-form" onSubmit={entrar} noValidate>
          <div className="login-form-mark"><Marca size={36} /><span>Nova Salud</span></div>
          <header className="login-head">
            <h2>Inicia sesión</h2>
            <p>Usa el correo y la contraseña de tu cuenta del personal.</p>
          </header>

          {aviso && <div className="login-alert info" role="status"><Icon d={I.alert} size={16} /><span>{aviso}</span></div>}

          <label className="lf">
            <span className="lf-label">Correo electrónico</span>
            <input
              ref={emailRef}
              name="email"
              type="email"
              inputMode="email"
              placeholder="nombre@novasalud.pe"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); setCampo('') }}
              autoComplete="username"
              spellCheck={false}
              aria-invalid={campo === 'email'}
            />
          </label>

          <label className="lf">
            <span className="lf-label">Contraseña</span>
            <span className="lf-pass">
              <input
                ref={passRef}
                name="password"
                type={verPass ? 'text' : 'password'}
                value={pass}
                onChange={(e) => { setPass(e.target.value); setError(''); setCampo('') }}
                onKeyUp={revisarMayus}
                onKeyDown={revisarMayus}
                onBlur={() => setMayus(false)}
                autoComplete="current-password"
                aria-invalid={campo === 'pass'}
                aria-describedby={mayus ? 'mayus' : undefined}
              />
              <button
                type="button"
                className="lf-eye"
                onClick={() => setVerPass((v) => !v)}
                aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verPass}
              >
                <Icon d={verPass ? I.eyeOff : I.eye} />
              </button>
            </span>
            {mayus && <span id="mayus" className="lf-hint">Bloq Mayús está activado</span>}
          </label>

          {error && <div className="login-alert" role="alert"><Icon d={I.alert} size={16} /><span>{error}</span></div>}

          <button type="submit" className="login-submit" disabled={enviando} aria-busy={enviando}>
            {enviando ? <><span className="spin" aria-hidden="true" />Ingresando…</> : <>Ingresar <Icon d={I.arrow} /></>}
          </button>

          <p className="login-note">¿Problemas para ingresar? Consulta al administrador.</p>
        </form>
      </main>

    </div>
  )
}
