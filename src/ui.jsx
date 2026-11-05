import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Icon } from './icons.jsx'

export function Badge({ tone = 'neutral', dot, children }) {
  return <span className={'badge ' + tone + (dot ? ' with-dot' : '')}>{dot && <i aria-hidden="true" />}{children}</span>
}

export function Btn({ kind = 'primary', small, className = '', ...p }) {
  return <button {...p} className={`btn ${kind}${small ? ' small' : ''} ${className}`} />
}

export function Card({ title, sub, action, children, className = '', style, onClick }) {
  return (
    <section className={'card ' + className} style={style} onClick={onClick}>
      {(title || action) && (
        <div className="card-h">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <p className="muted s">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

// Indicador numérico. Con onClick se vuelve un botón que lleva al módulo.
export function Kpi({ label, value, icon, tone = 'teal', foot, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={'kpi' + (onClick ? ' clic' : '')} onClick={onClick} type={onClick ? 'button' : undefined}>
      <div className="kpi-top">
        <span className="kpi-l">{label}</span>
        {icon && <span className={'kpi-ic ' + tone}><Icon name={icon} size={18} /></span>}
      </div>
      <b className="kpi-v">{value}</b>
      {(foot || onClick) && (
        <div className="kpi-f">
          {foot}
          {onClick && <Icon name="arrow" size={15} className="kpi-go" />}
        </div>
      )}
    </Tag>
  )
}

export function Chips({ options, value, onChange }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <button key={v} className={'chip' + (value === v ? ' on' : '')} onClick={() => onChange(v)}>{l}</button>
        )
      })}
    </div>
  )
}

// Cierra un menú desplegable al hacer clic fuera o al presionar Esc.
export function useFueraYEsc(ref, activo, cerrar) {
  useEffect(() => {
    if (!activo) return
    const fuera = (e) => { if (!ref.current?.contains(e.target)) cerrar() }
    const esc = (e) => { if (e.key === 'Escape') cerrar() }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [ref, activo, cerrar])
}

export function Modal({ title, onClose, children, width = 480 }) {
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width }} role="dialog" aria-label={title}>
        <div className="modal-h">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint, error }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <em className="err">{error}</em> : hint ? <em className="muted s">{hint}</em> : null}
    </label>
  )
}

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [t, setT] = useState(null)
  const show = useCallback((msg, tone = 'ok') => {
    setT({ msg, tone, k: Date.now() })
  }, [])
  useEffect(() => {
    if (!t) return
    const id = setTimeout(() => setT(null), 3200)
    return () => clearTimeout(id)
  }, [t])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && <div className={'toast ' + t.tone} key={t.k} role="status"><Icon name={t.tone === 'warn' ? 'alerta' : 'check'} size={17} /><span>{t.msg}</span></div>}
    </ToastCtx.Provider>
  )
}

// Estado de carga y error comunes a todas las pantallas.
export function Estado({ cargando, error, onReintentar }) {
  if (error) return (
    <div className="empty"><b>No se pudieron cargar los datos</b><p className="muted">{error}</p>{onReintentar && <Btn kind="secondary" small onClick={onReintentar}>Reintentar</Btn>}</div>
  )
  if (cargando) return <div className="skeleton-wrap">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>
  return null
}
