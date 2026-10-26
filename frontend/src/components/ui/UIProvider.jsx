import { createContext, useContext, useState, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ConfirmContext = createContext(null)
const ToastContext   = createContext(null)

/** Returns an async function: `const ok = await confirm('Delete this?', { danger:true })` */
export function useConfirm() {
  return useContext(ConfirmContext)
}
/** Returns a function: `toast('Saved successfully', 'success')` — types: success | error | info | warning */
export function useToast() {
  return useContext(ToastContext)
}

let toastSeq = 0
const TOAST_MS = 3500

const ICONS  = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle }
const COLORS = {
  success: { bg:'#ECFDF5', ring:'#A7F3D0', color:'#059669' },
  error:   { bg:'#FEF2F2', ring:'#FECACA', color:'#DC2626' },
  info:    { bg:'#EFF6FF', ring:'#BFDBFE', color:'#1B6BB5' },
  warning: { bg:'#FFFBEB', ring:'#FDE68A', color:'#D97706' },
}

/** Wrap your whole app with this once (in App.jsx) so any page can call useConfirm() / useToast(). */
export function UIProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null) // { message, title, danger, confirmLabel, cancelLabel, resolve }
  const [toasts, setToasts] = useState([])

  const confirm = useCallback((message, opts = {}) => {
    return new Promise(resolve => setConfirmState({ message, ...opts, resolve }))
  }, [])

  const respond = (result) => {
    confirmState?.resolve(result)
    setConfirmState(null)
  }

  const toast = useCallback((message, type = 'info') => {
    const id = ++toastSeq
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), TOAST_MS)
  }, [])

  const dismissToast = id => setToasts(t => t.filter(x => x.id !== id))

  return (
    <ConfirmContext.Provider value={confirm}>
      <ToastContext.Provider value={toast}>
        {children}

        {/* ── Confirm dialog ─────────────────────────────────── */}
        {confirmState && (() => {
          const gradient = confirmState.danger
            ? 'linear-gradient(90deg,#DC2626,#F87171)'
            : 'linear-gradient(90deg,#0F3460,#1B6BB5)'
          return (
            <div
              style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.55)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'kvh-ui-fade .12s ease-out' }}
              onClick={e => { if (e.target === e.currentTarget) respond(false) }}
            >
              <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:380, overflow:'hidden', boxShadow:'0 24px 70px rgba(0,0,0,.35)', animation:'kvh-ui-pop .16s cubic-bezier(.2,.9,.3,1.2)', fontFamily:"'Times New Roman', Times, serif" }}>
                <div style={{ height:4, background:gradient }}/>

                <div style={{ padding:'26px 24px 22px' }}>
                  <div style={{ display:'flex', gap:15, marginBottom:22 }}>
                    <div style={{
                      width:46, height:46, borderRadius:'50%', flexShrink:0,
                      background: confirmState.danger ? '#FEF2F2' : '#EFF6FF',
                      border: `2px solid ${confirmState.danger ? '#FECACA' : '#BFDBFE'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <AlertTriangle size={20} color={confirmState.danger ? '#DC2626' : '#1B6BB5'} />
                    </div>
                    <div style={{ paddingTop:2 }}>
                      <div style={{ fontWeight:800, fontSize:16, color:'#0F172A', marginBottom:5 }}>
                        {confirmState.title || (confirmState.danger ? 'Are you sure?' : 'Confirm')}
                      </div>
                      <div style={{ color:'#64748B', fontSize:13.5, lineHeight:1.55 }}>{confirmState.message}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                    <button onClick={() => respond(false)}
                      style={{ padding:'10px 20px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:10, fontSize:13.5, fontWeight:600, cursor:'pointer', color:'#64748B', transition:'background .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#F1F5F9'}
                      onMouseLeave={e=>e.currentTarget.style.background='#F8FAFC'}>
                      {confirmState.cancelLabel || 'Cancel'}
                    </button>
                    <button onClick={() => respond(true)}
                      style={{ padding:'10px 22px', background:gradient, color:'white', border:'none', borderRadius:10, fontSize:13.5, fontWeight:700, cursor:'pointer', boxShadow: confirmState.danger ? '0 4px 14px rgba(220,38,38,.3)' : '0 4px 14px rgba(27,107,181,.3)' }}>
                      {confirmState.confirmLabel || (confirmState.danger ? 'Delete' : 'OK')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Toasts ─────────────────────────────────────────── */}
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:600, display:'flex', flexDirection:'column', gap:10, pointerEvents:'none', fontFamily:"'Times New Roman', Times, serif" }}>
          {toasts.map(t => {
            const Icon = ICONS[t.type] || Info
            const c = COLORS[t.type] || COLORS.info
            return (
              <div key={t.id} style={{ position:'relative', background:'white', borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,.16)', minWidth:270, maxWidth:370, overflow:'hidden', animation:'kvh-toast-in .18s cubic-bezier(.2,.9,.3,1.1)', pointerEvents:'auto' }}>
                <div style={{ display:'flex', alignItems:'center', gap:11, padding:'13px 14px 13px 13px' }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:c.bg, border:`1.5px solid ${c.ring}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={15} color={c.color} />
                  </div>
                  <div style={{ flex:1, fontSize:13.5, color:'#0F172A', fontWeight:500 }}>{t.message}</div>
                  <button onClick={() => dismissToast(t.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#CBD5E1', display:'flex', flexShrink:0, padding:2 }}>
                    <X size={14}/>
                  </button>
                </div>
                <div style={{ height:3, background:'#F1F5F9' }}>
                  <div style={{ height:'100%', background:c.color, animation:`kvh-toast-shrink ${TOAST_MS}ms linear forwards` }}/>
                </div>
              </div>
            )
          })}
        </div>

        <style>{`
          @keyframes kvh-ui-fade { from { opacity:0 } to { opacity:1 } }
          @keyframes kvh-ui-pop  { from { opacity:0; transform:scale(.95) translateY(6px) } to { opacity:1; transform:scale(1) translateY(0) } }
          @keyframes kvh-toast-in { from { opacity:0; transform:translateX(24px) scale(.97) } to { opacity:1; transform:translateX(0) scale(1) } }
          @keyframes kvh-toast-shrink { from { width:100% } to { width:0% } }
        `}</style>
      </ToastContext.Provider>
    </ConfirmContext.Provider>
  )
}
