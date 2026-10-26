import { useState } from 'react'
import { Plus, Search, Edit, Trash2, Check, Eye, EyeOff,
         Shield, User, UserPlus, Lock, Mail } from 'lucide-react'
import { C }       from '../constants/colors.js'
import { useApi }  from '../hooks/useApi.js'
import { api }     from '../api/client.js'
import Card        from '../components/ui/Card.jsx'
import Btn         from '../components/ui/Btn.jsx'
import Input       from '../components/ui/Input.jsx'
import Select      from '../components/ui/Select.jsx'
import Modal       from '../components/ui/Modal.jsx'
import Table       from '../components/ui/Table.jsx'
import Badge       from '../components/ui/Badge.jsx'
import FormInput   from '../components/ui/FormInput.jsx'
import FormSelect  from '../components/ui/FormSelect.jsx'
import PageHeader  from '../components/ui/PageHeader.jsx'

const ALL_PAGES = [
  { key:'dashboard', label:'Dashboard'          },
  { key:'live',      label:'Live Tracking'      },
  { key:'vehicles',  label:'Vehicles'           },
  { key:'history',   label:'History / Playback' },
  { key:'alerts',    label:'Alerts'             },
  { key:'geofences', label:'Geofences'          },
  { key:'reports',   label:'Reports'            },
  { key:'devices',   label:'GPS Devices'        },
  { key:'settings',  label:'Settings'           },
]

const INIT = {
  name:'', username:'', email:'', password:'',
  role:'staff', status:'active', permissions:[],
}

function RoleBadge({ role }) {
  const isAdmin = role === 'admin'
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
      background: isAdmin ? '#1E3A5F' : C.accentL,
      color:      isAdmin ? 'white'   : C.accent,
      border:     `1px solid ${isAdmin ? C.accent : C.accentB}`,
    }}>
      {isAdmin ? <Shield size={10} /> : <User size={10} />}
      {isAdmin ? 'Admin' : 'Staff'}
    </span>
  )
}

export default function Clients() {
  const { data:clients, setData:setClients, loading, refresh } = useApi(api.clients.list)

  const [search,   setSearch]   = useState('')
  const [roleF,    setRoleF]    = useState('all')
  const [statusF,  setStatusF]  = useState('all')
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(INIT)
  const [showPass, setShowPass] = useState(false)
  const [viewC,    setViewC]    = useState(null)
  const [saving,   setSaving]   = useState(false)

  const setF = k => v => setForm(f => ({ ...f, [k]: v }))

  const togglePerm = page => setForm(f => ({
    ...f,
    permissions: f.permissions.includes(page)
      ? f.permissions.filter(p => p !== page)
      : [...f.permissions, page],
  }))

  const filtered = clients.filter(c => {
    const q  = search.toLowerCase()
    const ok = !q
      || c.name?.toLowerCase().includes(q)
      || c.username?.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
    return ok
      && (roleF   === 'all' || c.role   === roleF)
      && (statusF === 'all' || c.status === statusF)
  })

  const save = async () => {
    if (!form.name || !form.username || !form.email) {
      alert('Full name, username and email are required.')
      return
    }
    if (modal === 'add' && !form.password) {
      alert('Password is required when creating a new account.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        // Admin always gets full access to all pages
        permissions: form.role === 'admin'
          ? ALL_PAGES.map(p => p.key)
          : form.permissions,
      }

      // When editing — if password is blank, remove it from payload
      // so the existing password is kept
      if (modal === 'edit' && !payload.password) {
        delete payload.password
      }

      if (modal === 'add') {
        const created = await api.clients.create(payload)
        setClients(prev => [...prev, created])
      } else {
        const updated = await api.clients.update(form.client_id, payload)
        setClients(prev => prev.map(c => c.client_id === form.client_id ? updated : c))
      }
      setModal(null)
      setForm(INIT)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const del = async id => {
    if (!window.confirm('Delete this client account? They will no longer be able to login.')) return
    try {
      await api.clients.delete(id)
      setClients(prev => prev.filter(c => c.client_id !== id))
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const openAdd = () => {
    setForm(INIT)
    setShowPass(false)
    setModal('add')
  }

  const openEdit = row => {
    setForm({ ...row, password: '', permissions: Array.isArray(row.permissions) ? row.permissions : [] })
    setShowPass(false)
    setModal('edit')
  }

  const counts = {
    total:    clients.length,
    admin:    clients.filter(c => c.role   === 'admin').length,
    staff:    clients.filter(c => c.role   === 'staff').length,
    active:   clients.filter(c => c.status === 'active').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
  }

  return (
    <div style={{ padding:24 }}>
      <PageHeader title="Clients" subtitle={`${counts.total} registered accounts`}>
        <Btn onClick={refresh}><Search size={13} /></Btn>
        <Btn variant="primary" onClick={openAdd}>
          <Plus size={14} /> Add Client
        </Btn>
      </PageHeader>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        {[
          ['Total',    counts.total,    C.accent,  UserPlus],
          ['Admins',   counts.admin,    '#1E3A5F', Shield  ],
          ['Staff',    counts.staff,    C.blue,    User    ],
          ['Active',   counts.active,   C.green,   Check   ],
          ['Inactive', counts.inactive, C.muted,   Lock    ],
        ].map(([l, v, c, Icon]) => (
          <Card key={l} style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ color:C.muted, fontSize:11, marginBottom:4 }}>{l}</div>
              <div style={{ color:C.navy, fontSize:22, fontWeight:800 }}>{v}</div>
            </div>
            <div style={{ width:36, height:36, borderRadius:10, background:`${c}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={18} color={c} />
            </div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:10 }}>
          <Input
            placeholder="Search name, username, email…"
            value={search} onChange={setSearch}
            icon={<Search size={13} />}
            style={{ flex:1 }}
          />
          <Select value={roleF} onChange={setRoleF}
            options={[{value:'all',label:'All Roles'},{value:'admin',label:'Admin'},{value:'staff',label:'Staff'}]} />
          <Select value={statusF} onChange={setStatusF}
            options={[{value:'all',label:'All Status'},{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]} />
        </div>

        {loading
          ? <div style={{ padding:40, textAlign:'center', color:C.faint }}>Loading clients…</div>
          : <Table
              columns={[
                { key:'name', label:'Full Name', render:(v,r) => (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:r.role==='admin'?'#1E3A5F':C.accentL, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {r.role==='admin' ? <Shield size={14} color="white" /> : <User size={14} color={C.accent} />}
                    </div>
                    <div>
                      <div style={{ color:C.navy, fontWeight:600, fontSize:13 }}>{v}</div>
                      <div style={{ color:C.faint, fontSize:11 }}>@{r.username}</div>
                    </div>
                  </div>
                )},
                { key:'email',       label:'Email',      render:v => (
                  <span style={{ display:'flex', alignItems:'center', gap:5, color:C.muted, fontSize:12 }}>
                    <Mail size={11} /> {v}
                  </span>
                )},
                { key:'role',        label:'Role',       render:v => <RoleBadge role={v} /> },
                { key:'status',      label:'Status',     render:v => <Badge status={v==='active'?'online':'offline'} label={v} /> },
                { key:'permissions', label:'Access',     render:(v,r) => r.role==='admin'
                  ? <span style={{ color:C.green, fontSize:11, fontWeight:600 }}>Full Access</span>
                  : <span style={{ color:C.muted, fontSize:11 }}>{Array.isArray(v) ? v.length : 0} pages</span>
                },
                { key:'last_login',  label:'Last Login'  },
              ]}
              rows={filtered}
              onAction={row => [
                <Btn key="v" variant="ghost" onClick={() => { setViewC(row); setModal('view') }}>
                  <Eye size={13} />
                </Btn>,
                <Btn key="e" variant="ghost" onClick={() => openEdit(row)}>
                  <Edit size={13} />
                </Btn>,
                <Btn key="d" variant="ghost" onClick={() => del(row.client_id)} style={{ color:C.red }}>
                  <Trash2 size={13} />
                </Btn>,
              ]}
            />
        }
      </Card>

      {/* ── Add / Edit Modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal
          title={modal === 'add' ? 'Add Client Account' : 'Edit Client Account'}
          onClose={() => { setModal(null); setForm(INIT) }}
          wide
        >
          {/* Account info */}
          <div style={{ marginBottom:16, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ color:C.navy, fontWeight:700, fontSize:13, marginBottom:12 }}>
              Account Information
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <FormInput
                label="Full Name *"
                value={form.name}
                onChange={setF('name')}
                placeholder="Dara Sok"
              />
              <FormInput
                label="Username *"
                value={form.username}
                onChange={setF('username')}
                placeholder="dara"
              />
              <FormInput
                label="Email *"
                value={form.email}
                onChange={setF('email')}
                placeholder="dara@kvh.com"
                type="email"
              />

              {/* Password field */}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', color:C.mid, fontSize:12, fontWeight:600, marginBottom:5 }}>
                  {modal === 'edit' ? 'New Password' : 'Password *'}
                  <span style={{ color:C.faint, fontWeight:400, fontSize:11, marginLeft:6 }}>
                    {modal === 'edit' ? '(leave blank to keep current)' : '— user will login with this'}
                  </span>
                </label>
                <div style={{ position:'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setF('password')(e.target.value)}
                    placeholder={modal === 'edit' ? 'Leave blank to keep current' : 'Set login password'}
                    style={{
                      width:'100%', padding:'9px 36px 9px 12px',
                      border:`1.5px solid ${form.password ? C.green : C.border}`,
                      borderRadius:8, fontSize:13, color:C.navy,
                      outline:'none', boxSizing:'border-box',
                      transition:'border-color .15s',
                    }}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.faint, display:'flex' }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.password && (
                  <div style={{ color:C.green, fontSize:11, marginTop:4 }}>✅ Password set</div>
                )}
              </div>

              <FormSelect
                label="Status"
                value={form.status}
                onChange={setF('status')}
                options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]}
              />
            </div>
          </div>

          {/* Role selection */}
          <div style={{ marginBottom:16, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ color:C.navy, fontWeight:700, fontSize:13, marginBottom:12 }}>Role</div>
            <div style={{ display:'flex', gap:12 }}>
              {[
                ['admin', 'Admin', 'Full access to everything',      Shield, '#1E3A5F'],
                ['staff', 'Staff', 'Access limited by permissions',  User,   C.accent ],
              ].map(([val, label, desc, Icon, color]) => (
                <div key={val} onClick={() => setF('role')(val)}
                  style={{
                    flex:1, padding:16, borderRadius:12, cursor:'pointer',
                    border:`2px solid ${form.role === val ? color : C.border}`,
                    background: form.role === val ? `${color}08` : C.bg,
                    transition:'all .15s',
                  }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:form.role===val?`${color}20`:C.border, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon size={16} color={form.role === val ? color : C.muted} />
                    </div>
                    <span style={{ color:form.role===val?color:C.muted, fontWeight:700, fontSize:14 }}>
                      {label}
                    </span>
                    {form.role === val && (
                      <Check size={14} color={color} style={{ marginLeft:'auto' }} />
                    )}
                  </div>
                  <div style={{ color:C.faint, fontSize:12 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Page permissions — Staff only */}
          {form.role === 'staff' && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ color:C.navy, fontWeight:700, fontSize:13 }}>
                  Page Access
                  <span style={{ color:C.faint, fontWeight:400, fontSize:11, marginLeft:8 }}>
                    Select which pages this user can access
                  </span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <Btn variant="ghost" style={{ fontSize:11, padding:'4px 10px' }}
                    onClick={() => setForm(f => ({ ...f, permissions: ALL_PAGES.map(p => p.key) }))}>
                    <Check size={11} /> Select All
                  </Btn>
                  <Btn variant="ghost" style={{ fontSize:11, padding:'4px 10px' }}
                    onClick={() => setForm(f => ({ ...f, permissions: [] }))}>
                    Clear All
                  </Btn>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {ALL_PAGES.map(({ key, label }) => {
                  const checked = form.permissions.includes(key)
                  return (
                    <div key={key} onClick={() => togglePerm(key)}
                      style={{
                        display:'flex', alignItems:'center', gap:10,
                        padding:'10px 12px', borderRadius:9, cursor:'pointer',
                        border:`1.5px solid ${checked ? C.accent : C.border}`,
                        background: checked ? C.accentL : C.bg,
                        transition:'all .15s',
                      }}>
                      <div style={{
                        width:18, height:18, borderRadius:5, flexShrink:0,
                        background: checked ? C.accent : C.card,
                        border:`2px solid ${checked ? C.accent : C.border}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {checked && <Check size={11} color="white" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize:12, color:checked?C.accent:C.muted, fontWeight:checked?600:400 }}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop:10, color:C.faint, fontSize:11 }}>
                {form.permissions.length} of {ALL_PAGES.length} pages selected
              </div>
            </div>
          )}

          {/* Admin info banner */}
          {form.role === 'admin' && (
            <div style={{
              background:'#1E3A5F08', border:'1px solid #1E3A5F30',
              borderRadius:10, padding:14, marginBottom:16,
              display:'flex', alignItems:'center', gap:10,
            }}>
              <Shield size={18} color="#1E3A5F" />
              <div>
                <div style={{ color:'#1E3A5F', fontWeight:600, fontSize:13 }}>Admin — Full Access</div>
                <div style={{ color:C.muted, fontSize:12 }}>Admin accounts have access to all pages automatically.</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn onClick={() => { setModal(null); setForm(INIT) }}>Cancel</Btn>
            <Btn
              variant="primary"
              onClick={save}
              disabled={saving || !form.name || !form.username || !form.email}
            >
              <Check size={14} />
              {saving ? 'Saving…' : modal === 'add' ? 'Create Account' : 'Save Changes'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ── View Details Modal ── */}
      {modal === 'view' && viewC && (
        <Modal title="Client Account Details" onClose={() => setModal(null)}>
          {/* Profile header */}
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20, padding:16, background:C.bg, borderRadius:12 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:viewC.role==='admin'?'#1E3A5F':C.accentL, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {viewC.role === 'admin'
                ? <Shield size={24} color="white" />
                : <User size={24} color={C.accent} />
              }
            </div>
            <div>
              <div style={{ color:C.navy, fontWeight:700, fontSize:17 }}>{viewC.name}</div>
              <div style={{ color:C.muted, fontSize:13 }}>@{viewC.username} · {viewC.email}</div>
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                <RoleBadge role={viewC.role} />
                <Badge status={viewC.status==='active'?'online':'offline'} label={viewC.status} />
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              ['Full Name',  viewC.name],
              ['Username',   `@${viewC.username}`],
              ['Email',      viewC.email],
              ['Last Login', viewC.last_login || 'Never'],
            ].map(([l, v]) => (
              <div key={l} style={{ background:C.bg, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ color:C.faint, fontSize:10, marginBottom:3 }}>{l}</div>
                <div style={{ color:C.navy, fontSize:13, fontWeight:600 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Page access */}
          <div style={{ marginBottom:16 }}>
            <div style={{ color:C.navy, fontWeight:700, fontSize:13, marginBottom:10 }}>Page Access</div>
            {viewC.role === 'admin' ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:12, background:'#1E3A5F08', border:'1px solid #1E3A5F20', borderRadius:10 }}>
                <Shield size={16} color="#1E3A5F" />
                <span style={{ color:'#1E3A5F', fontWeight:600, fontSize:13 }}>Full access to all pages</span>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {ALL_PAGES.map(({ key, label }) => {
                  const has = Array.isArray(viewC.permissions) && viewC.permissions.includes(key)
                  return (
                    <div key={key} style={{
                      display:'flex', alignItems:'center', gap:7,
                      padding:'8px 10px', borderRadius:8,
                      background: has ? C.accentL : C.bg,
                      border:`1px solid ${has ? C.accentB : C.border}`,
                    }}>
                      <div style={{
                        width:16, height:16, borderRadius:4,
                        background: has ? C.accent : C.border,
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      }}>
                        {has && <Check size={10} color="white" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize:11, color:has?C.accent:C.faint, fontWeight:has?600:400 }}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn onClick={() => openEdit(viewC)}>
              <Edit size={13} /> Edit Account
            </Btn>
            <Btn onClick={() => setModal(null)}>Close</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}