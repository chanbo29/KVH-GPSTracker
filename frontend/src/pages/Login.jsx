import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, LogIn, Cpu } from 'lucide-react'
import { t } from '../constants/i18n.js'

const BLUE  = '#1B6BB5'
const BLUED = '#0F3460'
const BLUEL = '#EFF6FF'
const NAVY  = '#0F172A'
const RED   = '#DC2626'
const GRAY  = '#64748B'
const FAINT = '#94A3B8'
const BORDER= '#E2E8F0'

export default function Login({ onLogin, loading, error }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [focusU,   setFocusU]   = useState(false)
  const [focusP,   setFocusP]   = useState(false)

  const canSubmit = username.trim() && password && !loading

  const submit = async e => {
    e.preventDefault()
    if (!canSubmit) return
    await onLogin(username, password)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(160deg, ${BLUED} 0%, ${BLUE} 55%, #2980b9 100%)`,
      padding: '20px 16px',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background decoration */}
      <div style={{ position:'absolute', top:-80,  right:-80,  width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-120, left:-60, width:400, height:400, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:'30%', left:'8%', width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:'20%', right:'6%', width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>

      {/* Card */}
      <div style={{
        background: 'white',
        borderRadius: 24,
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,.28)',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Card top stripe */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${BLUED}, ${BLUE}, #56b4d3)` }}/>

        <div style={{ padding: '40px 36px 36px' }}>

          {/* Logo area */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <img
              src="/kvh-logo.png"
              alt="KVH"
              style={{ height: 52, marginBottom: 18, objectFit: 'contain' }}
              onError={e => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            {/* Fallback icon if logo missing */}
            <div style={{ width:56, height:56, borderRadius:16, background:`linear-gradient(135deg,${BLUED},${BLUE})`, display:'none', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', boxShadow:`0 8px 24px ${BLUE}44` }}>
              <Cpu size={28} color="white"/>
            </div>

            <div style={{ fontWeight:800, fontSize:22, color:NAVY, letterSpacing:.2, marginBottom:4 }}>
              {t('login.brand')}
            </div>
            <div style={{ color:FAINT, fontSize:13 }}>
              {t('login.subtitle')}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              background:'#FEF2F2', border:'1px solid #FECACA',
              borderRadius:12, padding:'11px 14px', marginBottom:22,
            }}>
              <AlertCircle size={15} color={RED} style={{ flexShrink:0 }}/>
              <span style={{ color:RED, fontSize:13, fontWeight:500 }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit}>

            {/* Username field */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:GRAY, marginBottom:7, letterSpacing:.3, textTransform:'uppercase' }}>
                {t('login.username')}
              </label>
              <div style={{
                display:'flex', alignItems:'center',
                border:`1.5px solid ${focusU ? BLUE : BORDER}`,
                borderRadius:12, background: focusU ? BLUEL : '#FAFBFC',
                transition:'all .2s', overflow:'hidden',
              }}>
                <div style={{ padding:'0 14px', color: focusU ? BLUE : FAINT, flexShrink:0, display:'flex' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocusU(true)}
                  onBlur={()  => setFocusU(false)}
                  placeholder={t('login.usernamePlaceholder')}
                  autoComplete="username"
                  autoFocus
                  style={{ flex:1, padding:'13px 14px 13px 0', border:'none', outline:'none', fontSize:14, color:NAVY, background:'transparent' }}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom:28 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:GRAY, marginBottom:7, letterSpacing:.3, textTransform:'uppercase' }}>
                {t('login.password')}
              </label>
              <div style={{
                display:'flex', alignItems:'center',
                border:`1.5px solid ${focusP ? BLUE : BORDER}`,
                borderRadius:12, background: focusP ? BLUEL : '#FAFBFC',
                transition:'all .2s', overflow:'hidden',
              }}>
                <div style={{ padding:'0 14px', color: focusP ? BLUE : FAINT, flexShrink:0, display:'flex' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusP(true)}
                  onBlur={()  => setFocusP(false)}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  style={{ flex:1, padding:'13px 0', border:'none', outline:'none', fontSize:14, color:NAVY, background:'transparent' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ padding:'0 14px', background:'none', border:'none', cursor:'pointer', color:FAINT, display:'flex', flexShrink:0 }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                width:'100%', padding:'14px',
                background: canSubmit
                  ? `linear-gradient(135deg, ${BLUED}, ${BLUE})`
                  : BORDER,
                color: canSubmit ? 'white' : FAINT,
                border:'none', borderRadius:13,
                fontSize:15, fontWeight:700,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                boxShadow: canSubmit ? `0 6px 20px ${BLUE}44` : 'none',
                transition:'all .2s',
                letterSpacing:.2,
              }}>
              {loading ? (
                <>
                  <div style={{ width:18, height:18, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,.3)', borderTopColor:'white', animation:'kvh-spin .7s linear infinite', flexShrink:0 }}/>
                  {t('login.signingIn')}
                </>
              ) : (
                <>
                  <LogIn size={17}/>
                  {t('login.signIn')}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card bottom footer */}
        <div style={{
          padding:'14px 36px',
          background:'#F8FAFC',
          borderTop:'1px solid #F1F5F9',
          textAlign:'center',
          color:FAINT, fontSize:11,
        }}>
          {t('login.footer')}
        </div>
      </div>

      <style>{`
        @keyframes kvh-spin { to { transform:rotate(360deg) } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
