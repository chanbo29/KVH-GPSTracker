import { useState } from 'react'
import { Plus, Trash2, Cpu, X, Save, Wifi, Edit, Eye, Loader2, Copy, Check } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { api }    from '../api/client.js'
import { LoadingStyles, Spinner, LoadingBar, SkeletonRows, SavingOverlay } from '../components/Loading.jsx'
import { useConfirm, useToast } from '../components/ui/UIProvider.jsx'

const B='#1B6BB5', G='#059669', R='#DC2626', A='#D97706'
const PROTOCOLS = ['GT06','TK103','H02','GT02','Other']
const BLANK = { imei:'', model:'GPS', sim_number:'', vehicle:'', protocol:'GT06', gps_status:'offline' }
const QUICK_BLANK = { imei:'', sim_number:'', protocol:'GT06' }
const SMS_DEFAULT = { apn:'metfone', ip:'208.122.29.50', port:'443', interval:'10' }

export default function GPSDevices() {
  const { data:devices, setData:setDevices, loading } = useApi(api.devices.list)
  const { data:vehicles } = useApi(api.vehicles.list)
  const confirm = useConfirm()
  const toast   = useToast()

  /* Edit / View modal */
  const [modal,   setModal]   = useState(false)   // false | 'edit' | 'view'
  const [form,    setForm]    = useState(BLANK)
  const [viewing, setViewing] = useState(null)    // device object for View modal
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')

  /* Editable SMS config-command templates, saved per-device (by IMEI) in localStorage */
  const [smsCfg,    setSmsCfg]    = useState(SMS_DEFAULT)
  const [copiedCmd, setCopiedCmd] = useState('')

  /* Inline quick-add state */
  const [quick,      setQuick]      = useState(QUICK_BLANK)
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickError,  setQuickError] = useState('')

  /* Looks up the driver assigned to whichever vehicle currently holds this device's IMEI. */
  /* This is computed live from the Vehicles list rather than the device's own `vehicle` field, */
  /* since the real link is the IMEI set on the Vehicles page — this stays in sync automatically. */
  const driverFor = imei => {
    const v = vehicles.find(v => v.imei === imei)
    if (!v) return null
    return v.owner && v.owner !== 'Unassigned' ? v.owner : null
  }

  const filtered = devices.filter(d =>
    !search || d.imei?.includes(search) || d.model?.toLowerCase().includes(search.toLowerCase()) || driverFor(d.imei)?.toLowerCase().includes(search.toLowerCase())
  )

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const fmtSIM = raw => raw.replace(/\D/g, '')

  const col = s => s==='online' ? G : s==='offline' ? '#94A3B8' : A


  /* ── Inline quick-add ────────────────────────────────────── */
  const quickValid = quick.imei.length === 15

  const submitQuick = async () => {
    if (!quickValid || quickSaving) return
    setQuickSaving(true)
    setQuickError('')
    try {
      const r = await api.devices.create({
        imei:            quick.imei,
        sim_number:      quick.sim_number,
        protocol:        quick.protocol,
        model:           'GPS',
        vehicle:         '',
        gps_status:      'offline',
        last_connection: '',
        last_update:     '',
      })
      setDevices(p => [...p, r])
      setQuick(QUICK_BLANK)
      toast('Device added', 'success')
    } catch (e) {
      let msg = e.message || 'Failed to add device.'
      try { msg = Object.values(JSON.parse(e.message)).flat().join(' ') } catch {}
      setQuickError(msg)
    } finally {
      setQuickSaving(false)
    }
  }

  const quickKeyDown = e => { if (e.key === 'Enter') submitQuick() }

  /* ── View modal ──────────────────────────────────────────── */
  const openView = d => {
    setViewing(d)
    setModal('view')
  }

  /* ── Edit modal ──────────────────────────────────────────── */
  const openEdit = d => {
    setForm({
      imei:        d.imei        || '',
      model:       d.model       || 'GPS',
      sim_number:  d.sim_number  || '',
      vehicle:     d.vehicle     || '',
      protocol:    d.protocol    || 'GT06',
      gps_status:  d.gps_status  || 'offline',
    })
    setEditId(d.device_id)
    try {
      const saved = JSON.parse(localStorage.getItem('kvh_sms_cfg_' + d.imei))
      setSmsCfg(saved && typeof saved === 'object' ? { ...SMS_DEFAULT, ...saved } : SMS_DEFAULT)
    } catch { setSmsCfg(SMS_DEFAULT) }
    setModal('edit')
  }

  /* Updates one SMS-template field and persists the whole set for this device,
     so the next time this device is opened the same values are pre-filled. */
  const fldSms = (k, v) => {
    setSmsCfg(prev => {
      const next = { ...prev, [k]: v }
      try { localStorage.setItem('kvh_sms_cfg_' + form.imei, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const copyCmd = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API unavailable/blocked — fall back to a hidden textarea + execCommand
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { toast('Could not copy — select and copy manually', 'error'); return }
    }
    setCopiedCmd(label)
    toast('Copied', 'success')
    setTimeout(() => setCopiedCmd(c => c === label ? '' : c), 1500)
  }

  const closeModal = () => { setModal(false); setForm(BLANK); setEditId(null); setViewing(null) }

  const save = async () => {
    setSaving(true)
    try {
      const r = await api.devices.update(editId, form)
      setDevices(p => p.map(d => d.device_id === editId ? { ...d, ...form } : d))
      toast('Changes saved', 'success')
      closeModal()
    } catch (e) { toast(e.message || 'Something went wrong', 'error') }
    finally { setSaving(false) }
  }

  /* ── Delete ──────────────────────────────────────────────── */
  const del = async id => {
    const ok = await confirm('This GPS device will be permanently removed. This cannot be undone.', {
      title: 'Delete device?', danger: true, confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await api.devices.delete(id)
      setDevices(p => p.filter(d => d.device_id !== id))
      toast('Device deleted', 'success')
    }
    catch (e) { toast(e.message || 'Failed to delete device', 'error') }
  }

  const isEdit = modal === 'edit'
  const isView = modal === 'view'

  return (
    <div style={{ padding:'28px 32px', maxWidth:1400, margin:'0 auto' }}>
      <LoadingStyles/>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:24, fontWeight:800, color:'#0F172A' }}>GPS Devices</div>
            {loading && <Spinner size={20}/>}
          </div>
          <div style={{ color:'#64748B', fontSize:14, marginTop:4 }}>
            {loading ? 'Loading devices…' : devices.length + ' devices registered'}
          </div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search IMEI, model, vehicle…"
          style={{ padding:'9px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', width:260 }}/>
      </div>
      <LoadingBar show={loading}/>

      {/* ── Table ───────────────────────────────────────────── */}
      <div style={{ background:'white', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#F8FAFC' }}>
              {['Device','IMEI','SIM','Driver','Protocol','Status','Actions'].map(h => (
                <th key={h} style={{ padding:'13px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748B', letterSpacing:.5, textTransform:'uppercase', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>

            {/* ── Inline quick-add row ──────────────────────── */}
            {!loading && (
              <tr style={{ background:'#EFF6FF', borderBottom:'1px solid #E2E8F0' }}>
                <td style={{ padding:'10px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:'white', border:`1.5px dashed ${B}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Plus size={16} color={B}/>
                    </div>
                    <span style={{ fontWeight:700, color:B, fontSize:13 }}>New device</span>
                  </div>
                </td>
                <td style={{ padding:'10px 16px' }}>
                  <input
                    value={quick.imei}
                    onChange={e => setQuick(q => ({ ...q, imei: e.target.value.replace(/\D/g,'').slice(0,15) }))}
                    onKeyDown={quickKeyDown}
                    placeholder="15-digit IMEI"
                    style={{ width:'100%', padding:'8px 10px', border:`1.5px solid ${quick.imei && !quickValid ? R : '#E2E8F0'}`, borderRadius:8, fontSize:12.5, fontFamily:'monospace', outline:'none', boxSizing:'border-box' }}
                  />
                </td>
                <td style={{ padding:'10px 16px' }}>
                  <input
                    value={quick.sim_number}
                    onChange={e => setQuick(q => ({ ...q, sim_number: fmtSIM(e.target.value) }))}
                    onKeyDown={quickKeyDown}
                    placeholder="SIM number"
                    style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:12.5, outline:'none', boxSizing:'border-box' }}
                  />
                </td>
                <td style={{ padding:'10px 16px', color:'#94A3B8', fontSize:12.5, fontStyle:'italic' }}>
                  Assign a vehicle first
                </td>
                <td style={{ padding:'10px 16px' }}>
                  <select
                    value={quick.protocol}
                    onChange={e => setQuick(q => ({ ...q, protocol: e.target.value }))}
                    style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:12.5, outline:'none', background:'white', boxSizing:'border-box' }}
                  >
                    {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td style={{ padding:'10px 16px' }}>
                  <span style={{ background:'#E2E8F018', color:'#94A3B8', fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, border:'1px solid #E2E8F0' }}>
                    offline
                  </span>
                </td>
                <td style={{ padding:'10px 16px' }}>
                  <button
                    onClick={submitQuick}
                    disabled={!quickValid || quickSaving}
                    style={{
                      display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'none',
                      background: quickValid ? B : '#CBD5E1', color:'white', fontSize:12.5, fontWeight:700,
                      cursor: quickValid && !quickSaving ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {quickSaving ? <Loader2 size={13} style={{ animation:'kvh-spin .7s linear infinite' }}/> : <Plus size={13}/>}
                    Add
                  </button>
                  {quickError && <div style={{ color:R, fontSize:11, marginTop:5 }}>{quickError}</div>}
                  {!quickError && quick.imei && !quickValid && (
                    <div style={{ color:'#94A3B8', fontSize:11, marginTop:5 }}>{quick.imei.length} / 15 digits</div>
                  )}
                </td>
              </tr>
            )}

            {loading ? (
              <SkeletonRows n={5} cols={['14%','22%','14%','14%','10%','10%','16%']}/>
            ) : filtered.map(d => (
              <tr key={d.device_id} style={{ borderBottom:'1px solid #F1F5F9' }}>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Cpu size={17} color={B}/>
                    </div>
                    <span style={{ fontWeight:700, color:'#0F172A' }}>{d.model||'GPS'}</span>
                  </div>
                </td>
                <td style={{ padding:'14px 16px', fontFamily:'monospace', fontSize:12, color:'#64748B' }}>{d.imei}</td>
                <td style={{ padding:'14px 16px', color:'#64748B', fontSize:13 }}>{d.sim_number ? d.sim_number.replace(/-/g,'') : '—'}</td>
                <td style={{ padding:'14px 16px', color:'#64748B', fontSize:13 }}>{driverFor(d.imei) || 'Unassigned'}</td>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, color:'#64748B', fontSize:13 }}>
                    <Wifi size={13}/>{d.protocol||'—'}
                  </div>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <span style={{ background:col(d.gps_status)+'18', color:col(d.gps_status), fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20 }}>
                    {d.gps_status}
                  </span>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => openView(d)}
                      style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, color:'#64748B', fontSize:12, fontWeight:600 }}>
                      <Eye size={13}/> View
                    </button>
                    <button onClick={() => openEdit(d)}
                      style={{ background:'#EFF6FF', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, color:B, fontSize:12, fontWeight:600 }}>
                      <Edit size={13}/> Edit
                    </button>
                    <button onClick={() => del(d.device_id)}
                      style={{ background:'#FEF2F2', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, color:R, fontSize:12, fontWeight:600 }}>
                      <Trash2 size={13}/> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:52, color:'#94A3B8' }}>
            <Cpu size={36} color="#CBD5E1" style={{ margin:'0 auto 12px' }}/>
            <div style={{ fontWeight:600, fontSize:15, color:'#64748B', marginBottom:6 }}>No GPS devices found</div>
            <div style={{ fontSize:13 }}>Try a different search, or add one using the row above.</div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          VIEW MODAL — read-only
      ══════════════════════════════════════════════════════════ */}
      {isView && viewing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:460, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

            <div style={{ padding:'20px 24px', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Cpu size={19} color={B}/>
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:'#0F172A' }}>{viewing.model || 'GPS'}</div>
                  <div style={{ fontSize:11.5, color:'#94A3B8', fontFamily:'monospace' }}>{viewing.imei}</div>
                </div>
              </div>
              <button onClick={closeModal}
                style={{ background:'#F1F5F9', border:'none', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <X size={16}/>
              </button>
            </div>

            <div style={{ overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              {[
                ['SIM Number',     viewing.sim_number ? viewing.sim_number.replace(/-/g,'') : '—'],
                ['Assigned Driver', driverFor(viewing.imei) || 'Unassigned'],
                ['Protocol',       viewing.protocol || '—'],
                ['Status',         viewing.gps_status || '—'],
                ['Last Connection', viewing.last_connection || '—'],
                ['Last Update',    viewing.last_update || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:12, borderBottom:'1px solid #F1F5F9' }}>
                  <span style={{ fontSize:13, color:'#64748B' }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F172A', textTransform: label === 'Status' ? 'capitalize' : 'none' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ padding:'16px 24px', borderTop:'1px solid #E2E8F0', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={closeModal}
                style={{ padding:'10px 20px', background:'#F1F5F9', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', color:'#64748B' }}>
                Close
              </button>
              <button onClick={() => { closeModal(); openEdit(viewing) }}
                style={{ padding:'10px 20px', background:B, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
                <Edit size={14}/> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          EDIT MODAL — full details (model, vehicle assignment, status)
      ══════════════════════════════════════════════════════════ */}
      {isEdit && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:520, maxHeight:'90vh', display:'flex', flexDirection:'column', position:'relative' }}>
            <SavingOverlay show={saving}/>

            <div style={{ padding:'20px 24px', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:18, color:'#0F172A' }}>Edit GPS Device</div>
                <div style={{ fontSize:12, color:'#94A3B8', marginTop:3, fontFamily:'monospace' }}>{form.imei}</div>
              </div>
              <button onClick={closeModal}
                style={{ background:'#F1F5F9', border:'none', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <X size={16}/>
              </button>
            </div>

            <div style={{ overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>IMEI (read-only)</label>
                <input
                  value={form.imei}
                  readOnly
                  style={{ width:'100%', padding:'11px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'monospace', background:'#F8FAFC', color:'#64748B', cursor:'not-allowed' }}
                />
              </div>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>Device Model</label>
                <input value={form.model} onChange={e => fld('model', e.target.value)} placeholder="e.g. GT06 Tracker"
                  style={{ width:'100%', padding:'11px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }}/>
              </div>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>SIM Number</label>
                <input
                  value={form.sim_number}
                  onChange={e => fld('sim_number', fmtSIM(e.target.value))}
                  placeholder="SIM number"
                  type="tel"
                  style={{ width:'100%', padding:'11px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }}
                />
              </div>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>Assigned Driver</label>
                <div style={{ width:'100%', padding:'11px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, boxSizing:'border-box', background:'#F8FAFC', color: driverFor(form.imei) ? '#0F172A' : '#94A3B8' }}>
                  {driverFor(form.imei) || 'Unassigned'}
                </div>
                <div style={{ marginTop:6, color:'#94A3B8', fontSize:11.5 }}>
                  Set automatically — assign this device to a vehicle from the Vehicles page to change it
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>Protocol</label>
                <select value={form.protocol} onChange={e => fld('protocol', e.target.value)}
                  style={{ width:'100%', padding:'11px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', background:'white' }}>
                  {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#64748B', marginBottom:6 }}>Device Status</label>
                <select value={form.gps_status} onChange={e => fld('gps_status', e.target.value)}
                  style={{ width:'100%', padding:'11px 14px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, outline:'none', background:'white' }}>
                  {['online','offline','idle'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>

              <div style={{ background:'#EFF6FF', borderRadius:10, padding:'14px', border:'1px solid #BFDBFE' }}>
                <div style={{ color:B, fontWeight:700, fontSize:13, marginBottom:10 }}>📡 SMS config commands — send to device SIM</div>

                {/* Editable fields feeding the generated commands below */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10.5, fontWeight:700, color:'#64748B', marginBottom:3, textTransform:'uppercase', letterSpacing:.4 }}>APN</label>
                    <input value={smsCfg.apn} onChange={e => fldSms('apn', e.target.value)}
                      style={{ width:'100%', padding:'7px 9px', border:'1px solid #BFDBFE', borderRadius:7, fontSize:12.5, outline:'none', boxSizing:'border-box', fontFamily:'monospace', background:'white' }}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10.5, fontWeight:700, color:'#64748B', marginBottom:3, textTransform:'uppercase', letterSpacing:.4 }}>Report interval (sec)</label>
                    <input value={smsCfg.interval} onChange={e => fldSms('interval', e.target.value.replace(/\D/g,''))}
                      style={{ width:'100%', padding:'7px 9px', border:'1px solid #BFDBFE', borderRadius:7, fontSize:12.5, outline:'none', boxSizing:'border-box', fontFamily:'monospace', background:'white' }}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10.5, fontWeight:700, color:'#64748B', marginBottom:3, textTransform:'uppercase', letterSpacing:.4 }}>Server IP</label>
                    <input value={smsCfg.ip} onChange={e => fldSms('ip', e.target.value)}
                      style={{ width:'100%', padding:'7px 9px', border:'1px solid #BFDBFE', borderRadius:7, fontSize:12.5, outline:'none', boxSizing:'border-box', fontFamily:'monospace', background:'white' }}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10.5, fontWeight:700, color:'#64748B', marginBottom:3, textTransform:'uppercase', letterSpacing:.4 }}>Server port</label>
                    <input value={smsCfg.port} onChange={e => fldSms('port', e.target.value.replace(/\D/g,''))}
                      style={{ width:'100%', padding:'7px 9px', border:'1px solid #BFDBFE', borderRadius:7, fontSize:12.5, outline:'none', boxSizing:'border-box', fontFamily:'monospace', background:'white' }}/>
                  </div>
                </div>

                {/* Generated commands — click to copy each one */}
                {[
                  ['apn',      `APN,${smsCfg.apn}#`],
                  ['server',   `SERVER,0,${smsCfg.ip},${smsCfg.port},0#`],
                  ['interval', `TIMER,${smsCfg.interval}#`],
                  ['imei',     'IMEI#'],
                ].map(([key, cmd]) => (
                  <button key={key} onClick={() => copyCmd(key, cmd)} title="Click to copy"
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, fontFamily:'monospace', fontSize:12, color:'#0F172A', background:'white', border:'1px solid transparent', borderRadius:6, padding:'7px 10px', marginBottom:5, cursor:'pointer', textAlign:'left' }}>
                    <span>{cmd}</span>
                    {copiedCmd === key
                      ? <Check size={13} color={G} style={{ flexShrink:0 }}/>
                      : <Copy size={13} color="#94A3B8" style={{ flexShrink:0 }}/>}
                  </button>
                ))}
                <div style={{ color:'#64748B', fontSize:11, marginTop:4 }}>Tap a command to copy it, then send it as a separate SMS to your GPS SIM card. These fields are remembered for this device next time.</div>
              </div>
            </div>

            <div style={{ padding:'16px 24px', borderTop:'1px solid #E2E8F0', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={closeModal}
                style={{ padding:'10px 20px', background:'#F1F5F9', border:'1px solid #E2E8F0', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', color:'#64748B' }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                style={{ padding:'10px 24px', background:B, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor: saving ? 'not-allowed':'pointer', display:'flex', alignItems:'center', gap:8 }}>
                {saving ? <><Spinner size={16} color="white"/> Saving…</> : <><Save size={15}/>Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes kvh-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}