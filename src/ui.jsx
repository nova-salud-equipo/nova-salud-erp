import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export function Badge({ tone = 'neutral', children }) {
  return <span className={'badge ' + tone}>{children}</span>
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
      {t && <div className={'toast ' + t.tone} key={t.k} role="status">{t.msg}</div>}
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
