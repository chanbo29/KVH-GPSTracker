import { useState } from 'react'
import { Plus, Search, Edit, Trash2, Check, Eye, EyeOff,
         Shield, User, Users, Lock, Mail, Settings } from 'lucide-react'
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
import PageHeader  from '../components/ui/PageHeader.jsx'
import {
  LoadingStyles,
  Spinner,
  LoadingBar,
  Skel,
  SkeletonRows,
  SkeletonStatCard,
  SavingOverlay,
} from '../components/Loading.jsx'

/* Full page list, matching every item in the sidebar — grouped the same way ── */
/* so the permission picker and the sidebar always stay in sync.               */
const PAGE_SECTIONS = [
  { label: 'Overview',   pages: [
    { key:'dashboard',  label:'Dashboard'          },
    { key:'live',       label:'Live Tracking'      },
  ]},
  { label: 'Fleet',      pages: [
    { key:'vehicles',   label:'Vehicles'           },
    { key:'drivers',    label:'Drivers'            },
    { key:'devices',    label:'GPS Devices'        },
    { key:'geofences',  label:'Geofences'          },
  ]},
  { label: 'Operations', pages: [
    { key:'history',    label:'History / Playback' },
    { key:'alerts',     label:'Alerts'             },
    { key:'reports',    label:'Reports'            },
    { key:'maintenance',label:'Maintenance'        },
    { key:'fuel',       label:'Fuel Log'           },
  ]},
  { label: 'Admin',      pages: [
    { key:'users',      label:'Users'              },
    { key:'settings',   label:'Settings'           },
    { key:'sms',        label:'SMS Config'         },
  ]},
]
const ALL_PAGES = PAGE_SECTIONS.flatMap(s => s.pages)

const BORDER = '1px solid #E2E8F0'

const loadRoles = () => {
  try {
    const saved = localStorage.getItem('kvh_roles')
    return saved ? JSON.parse(saved) : [
      { id:1, name:'Manager',    permissions: ALL_PAGES.map(p => p.key) },
      { id:2, name:'Supervisor', permissions: ['dashboard','live','vehicles','alerts'] },
      { id:3, name:'Officer',    permissions: ['dashboard','live'] },
    ]
  } catch { return [] }
}
const saveRoles = roles => localStorage.setItem('kvh_roles', JSON.stringify(roles))

const INIT_USER = { username:'', email:'', password:'', role_id:'', role:'staff', status:'active', permissions:[] }
const INIT_ROLE = { name:'', permissions:[] }

function RoleBadge({ name, isAdmin }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background: isAdmin ? '#1E3A5F' : C.accentL, color: isAdmin ? 'white' : C.accent, border: '1px solid ' + (isAdmin ? C.accent : C.accentB) }}>
      {isAdmin ? <Shield size={10} /> : <User size={10} />}
      {name || 'Staff'}
    </span>
  )
}

/* ── Skeleton: stat cards row ─────────────────────────────────── */
function StatsSkeleton() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
      {[0,1,2,3].map(i => (
        <Card key={i} style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ flex:1 }}>
            <Skel w="55%" h={11} r={5} style={{ marginBottom:10 }} />
            <Skel w="35%" h={26} r={6} />
          </div>
          <Skel w={36} h={36} r={10} />
        </Card>
      ))}
    </div>
  )
}

/* ── Skeleton: role cards ─────────────────────────────────────── */
function RolesSkeleton() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
      {[0,1,2].map(i => (
        <Card key={i} style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <Skel w={36} h={36} r={10} />
            <div style={{ flex:1 }}>
              <Skel h={15} r={6} style={{ marginBottom:6 }} />
              <Skel w="50%" h={11} r={5} />
            </div>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {[0,1,2,3,4].map(j => <Skel key={j} w={70} h={22} r={6} />)}
          </div>
        </Card>
      ))}
    </div>
  )
}

/* ── Grouped permission badges (role cards + View User modal) ─── */
function GroupedPermissionBadges({ permissions, compact }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {PAGE_SECTIONS.map(section => (
        <div key={section.label}>
          <div style={{ color:C.faint, fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:'uppercase', marginBottom:5 }}>
            {section.label}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {section.pages.map(p => {
              const has = permissions.includes(p.key)
              return (
                <span key={p.key} style={{ padding: compact ? '3px 8px' : '4px 9px', borderRadius:6, fontSize:11, fontWeight: has?600:400, background: has?C.accentL:'#F8FAFC', color: has?C.accent:C.faint, border: '1px solid '+(has?C.accentB:'#E2E8F0') }}>
                  {has?'✓ ':''}{p.label}
                </span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Grouped permission checkboxes (Add/Edit Role modal) ───────── */
function GroupedPermissionPicker({ permissions, onToggle, onToggleSection }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {PAGE_SECTIONS.map(section => {
        const sectionKeys = section.pages.map(p => p.key)
        const allChecked  = sectionKeys.every(k => permissions.includes(k))
        const someChecked = sectionKeys.some(k => permissions.includes(k))
        return (
          <div key={section.label}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:.5, textTransform:'uppercase' }}>
                {section.label}
              </span>
              <button onClick={() => onToggleSection(sectionKeys, !allChecked)}
                style={{ background:'none', border:'none', cursor:'pointer', color: allChecked ? C.accent : C.faint, fontSize:11, fontWeight:600 }}>
                {allChecked ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {section.pages.map(({ key, label }) => {
                const checked = permissions.includes(key)
                return (
                  <div key={key} onClick={() => onToggle(key)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:9, cursor:'pointer', border:'1.5px solid '+(checked?C.accent:'#E2E8F0'), background: checked?C.accentL:C.bg, transition:'all .15s' }}>
                    <div style={{ width:18, height:18, borderRadius:5, flexShrink:0, background: checked?C.accent:'white', border:'2px solid '+(checked?C.accent:'#E2E8F0'), display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {checked && <Check size={11} color="white" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize:12, color: checked?C.accent:C.muted, fontWeight: checked?600:400 }}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function UsersPage() {
  const { data:users, setData:setUsers, loading } = useApi(api.clients.list)

  const [tab,        setTab]        = useState('users')
  const [roles,      setRoles]      = useState(loadRoles)
  const [search,     setSearch]     = useState('')
  const [modal,      setModal]      = useState(null)
  const [userForm,   setUserForm]   = useState(INIT_USER)
  const [roleForm,   setRoleForm]   = useState(INIT_ROLE)
  const [showPass,   setShowPass]   = useState(false)
  const [viewU,      setViewU]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [editRoleId, setEditRoleId] = useState(null)

  const setUF = k => v => setUserForm(f => ({ ...f, [k]: v }))
  const setRF = k => v => setRoleForm(f => ({ ...f, [k]: v }))
  const toggleRolePerm = page => setRoleForm(f => ({
    ...f,
    permissions: f.permissions.includes(page)
      ? f.permissions.filter(p => p !== page)
      : [...f.permissions, page],
  }))
  const toggleRoleSection = (keys, select) => setRoleForm(f => ({
    ...f,
    permissions: select
      ? [...new Set([...f.permissions, ...keys])]
      : f.permissions.filter(p => !keys.includes(p)),
  }))

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  /* ── Save User ────────────────────────────────────────────── */
  const saveUser = async () => {
    if (!userForm.username || !userForm.email)            { alert('Username and email are required.'); return }
    if (modal === 'add-user' && !userForm.password)       { alert('Password is required.'); return }
    if (!userForm.role_id && !userForm.is_admin)          { alert('Please select a role.'); return }
    setSaving(true)
    try {
      const selectedRole = roles.find(r => String(r.id) === String(userForm.role_id))
      const payload = {
        name:        selectedRole ? selectedRole.name : (userForm.is_admin ? 'Admin' : 'Staff'),
        username:    userForm.username,
        email:       userForm.email,
        role:        userForm.is_admin ? 'admin' : 'staff',
        status:      'active',
        permissions: userForm.is_admin ? ALL_PAGES.map(p => p.key) : (selectedRole ? selectedRole.permissions : []),
      }
      if (userForm.password) payload.password = userForm.password
      if (modal === 'add-user') {
        const created = await api.clients.create(payload)
        setUsers(prev => [...prev, created])
      } else {
        const updated = await api.clients.update(userForm.client_id, payload)
        setUsers(prev => prev.map(u => u.client_id === userForm.client_id ? updated : u))
      }
      setModal(null); setUserForm(INIT_USER)
    } catch (err) { alert('Error: ' + err.message) }
    finally { setSaving(false) }
  }

  /* ── Save Role ────────────────────────────────────────────── */
  const saveRole = () => {
    if (!roleForm.name) { alert('Role name is required.'); return }
    const updated = editRoleId
      ? roles.map(r => r.id === editRoleId ? { ...r, name: roleForm.name, permissions: roleForm.permissions } : r)
      : [...roles, { id: Date.now(), name: roleForm.name, permissions: roleForm.permissions }]
    setRoles(updated); saveRoles(updated)
    setModal(null); setRoleForm(INIT_ROLE); setEditRoleId(null)
  }

  const delRole = id => {
    if (!window.confirm('Delete this role?')) return
    const updated = roles.filter(r => r.id !== id)
    setRoles(updated); saveRoles(updated)
  }

  const delUser = async id => {
    if (!window.confirm('Delete this user?')) return
    try { await api.clients.delete(id); setUsers(prev => prev.filter(u => u.client_id !== id)) }
    catch (err) { alert('Error: ' + err.message) }
  }

  const openAddUser  = ()   => { setUserForm(INIT_USER); setShowPass(false); setModal('add-user') }
  const openEditUser = row  => { setUserForm({ ...row, password:'', role_id:'', is_admin: row.role==='admin', permissions: Array.isArray(row.permissions) ? row.permissions : [] }); setShowPass(false); setModal('edit-user') }
  const openAddRole  = ()   => { setRoleForm(INIT_ROLE); setEditRoleId(null); setModal('add-role') }
  const openEditRole = role => { setRoleForm({ name: role.name, permissions: role.permissions }); setEditRoleId(role.id); setModal('add-role') }

  const counts = {
    total:  users.length,
    admin:  users.filter(u => u.role === 'admin').length,
    staff:  users.filter(u => u.role === 'staff').length,
    active: users.filter(u => u.status === 'active').length,
  }

  return (
    <div style={{ padding:24 }}>
      <LoadingStyles />

      <PageHeader title="Users" subtitle={loading ? 'Loading users…' : counts.total + ' system users'}>
        {loading && <Spinner size={20} />}
        {tab === 'roles' && !loading && (
          <Btn variant="primary" onClick={openAddRole}><Plus size={14} /> Add Role</Btn>
        )}
        {tab === 'users' && !loading && (
          <Btn variant="primary" onClick={openAddUser}><Plus size={14} /> Add User</Btn>
        )}
      </PageHeader>

      <LoadingBar show={loading} />

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'white', padding:4, borderRadius:10, width:'fit-content', boxShadow:'0 1px 4px rgba(0,0,0,.06)', marginTop:12 }}>
        {[['users','Users',Users],['roles','Roles & Permissions',Settings]].map(([id,label,Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight: tab===id?700:400, background: tab===id?C.accent:'transparent', color: tab===id?'white':C.muted, transition:'all .15s' }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          USERS TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'users' && (
        <>
          {loading ? <StatsSkeleton /> : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {[
                ['Total Users', counts.total,  C.accent,  Users ],
                ['Admins',      counts.admin,  '#1E3A5F', Shield],
                ['Staff',       counts.staff,  C.blue,    User  ],
                ['Active',      counts.active, C.green,   Check ],
              ].map(([l,v,c,Icon]) => (
                <Card key={l} style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ color:C.muted, fontSize:11, marginBottom:4 }}>{l}</div>
                    <div style={{ color:C.navy, fontSize:22, fontWeight:800 }}>{v}</div>
                  </div>
                  <div style={{ width:36, height:36, borderRadius:10, background:c+'20', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={18} color={c} />
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <div style={{ padding:'14px 16px', borderBottom:BORDER, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1 }}>
                <Input placeholder="Search users…" value={search} onChange={setSearch} icon={<Search size={13} />} />
              </div>
              {loading && <Spinner size={18} />}
            </div>

            {loading ? (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#F8FAFC' }}>
                    {['User','Role / Position','Status','Page Access','Last Login','Actions'].map(h => (
                      <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', borderBottom:BORDER }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #F8FAFC' }}>
                      <td style={{ padding:'14px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <Skel w={36} h={36} r={18} />
                          <div>
                            <Skel w={100} h={13} r={5} style={{ marginBottom:6 }} />
                            <Skel w={140} h={10} r={5} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'14px 16px' }}><Skel w={80} h={22} r={20} /></td>
                      <td style={{ padding:'14px 16px' }}><Skel w={60} h={22} r={20} /></td>
                      <td style={{ padding:'14px 16px' }}><Skel w={55} h={13} r={5} /></td>
                      <td style={{ padding:'14px 16px' }}><Skel w={90} h={13} r={5} /></td>
                      <td style={{ padding:'14px 16px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <Skel w={28} h={28} r={8} />
                          <Skel w={28} h={28} r={8} />
                          <Skel w={28} h={28} r={8} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Table
                columns={[
                  { key:'name', label:'User', render:(v,r) => (
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background: r.role==='admin'?'#1E3A5F':C.accentL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {r.role==='admin' ? <Shield size={16} color="white" /> : <User size={16} color={C.accent} />}
                      </div>
                      <div>
                        <div style={{ color:C.navy, fontWeight:600, fontSize:13 }}>{r.username}</div>
                        <div style={{ color:C.faint, fontSize:11 }}>{r.email}</div>
                      </div>
                    </div>
                  )},
                  { key:'name', label:'Role / Position', render:(v,r) => <RoleBadge name={v} isAdmin={r.role==='admin'} /> },
                  { key:'status', label:'Status', render:v => <Badge status={v==='active'?'online':'offline'} label={v} /> },
                  { key:'permissions', label:'Page Access', render:(v,r) => r.role==='admin'
                    ? <span style={{ color:C.green, fontSize:11, fontWeight:600 }}>Full Access</span>
                    : <span style={{ color:C.muted, fontSize:11 }}>{Array.isArray(v)?v.length:0} pages</span>
                  },
                  { key:'last_login', label:'Last Login' },
                ]}
                rows={filtered}
                onAction={row => [
                  <Btn key="v" variant="ghost" onClick={() => { setViewU(row); setModal('view') }}><Eye size={13} /></Btn>,
                  <Btn key="e" variant="ghost" onClick={() => openEditUser(row)}><Edit size={13} /></Btn>,
                  <Btn key="d" variant="ghost" onClick={() => delUser(row.client_id)} style={{ color:C.red }}><Trash2 size={13} /></Btn>,
                ]}
              />
            )}

            {!loading && filtered.length === 0 && (
              <div style={{ padding:52, textAlign:'center', color:C.faint }}>
                <Users size={36} color="#CBD5E1" style={{ margin:'0 auto 12px' }} />
                <div style={{ fontWeight:600, fontSize:15, color:C.navy, marginBottom:6 }}>No users found</div>
                <div style={{ fontSize:13 }}>Try a different search term or add a new user.</div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          ROLES TAB — cards now show grouped, sectioned permissions
      ══════════════════════════════════════════════════════════ */}
      {tab === 'roles' && (
        <div>
          <div style={{ marginBottom:12, color:C.muted, fontSize:13 }}>
            Create custom roles with specific page permissions. Assign these roles to users.
          </div>

          {loading ? <RolesSkeleton /> : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
              {roles.map(role => (
                <Card key={role.id} style={{ padding:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:C.accentL, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Shield size={18} color={C.accent} />
                      </div>
                      <div>
                        <div style={{ color:C.navy, fontWeight:700, fontSize:15 }}>{role.name}</div>
                        <div style={{ color:C.muted, fontSize:11 }}>{role.permissions.length} / {ALL_PAGES.length} pages</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <Btn variant="ghost" onClick={() => openEditRole(role)}><Edit size={13} /></Btn>
                      <Btn variant="ghost" onClick={() => delRole(role.id)} style={{ color:C.red }}><Trash2 size={13} /></Btn>
                    </div>
                  </div>
                  <GroupedPermissionBadges permissions={role.permissions} />
                </Card>
              ))}

              {/* Add role card */}
              <div onClick={openAddRole}
                style={{ border:'2px dashed #E2E8F0', borderRadius:12, padding:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', gap:8, minHeight:140, transition:'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.background=C.accentL }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.background='transparent' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:C.accentL, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Plus size={20} color={C.accent} />
                </div>
                <span style={{ color:C.accent, fontWeight:600, fontSize:13 }}>Create New Role</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ADD / EDIT USER MODAL
      ══════════════════════════════════════════════════════════ */}
      {(modal === 'add-user' || modal === 'edit-user') && (
        <Modal
          title={modal === 'add-user' ? 'Add New User' : 'Edit User'}
          onClose={() => { setModal(null); setUserForm(INIT_USER) }}
          wide
        >
          <div style={{ position:'relative' }}>
            <SavingOverlay show={saving} />

            <div style={{ marginBottom:20, paddingBottom:20, borderBottom:BORDER }}>
              <div style={{ color:C.navy, fontWeight:700, fontSize:13, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:C.accentL, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <User size={13} color={C.accent} />
                </div>
                Account Information
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', color:C.mid, fontSize:12, fontWeight:600, marginBottom:5 }}>Username *</label>
                  <input type="text" value={userForm.username} onChange={e => setUF('username')(e.target.value)} placeholder="e.g. dara_sok"
                    style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:8, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }} />
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', color:C.mid, fontSize:12, fontWeight:600, marginBottom:5 }}>Email *</label>
                  <div style={{ position:'relative' }}>
                    <Mail size={14} color={C.muted} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
                    <input type="email" value={userForm.email} onChange={e => setUF('email')(e.target.value)} placeholder="dara@kvh.com"
                      style={{ width:'100%', padding:'10px 12px 10px 36px', border:BORDER, borderRadius:8, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }} />
                  </div>
                </div>
                <div style={{ marginBottom:4, gridColumn:'1 / -1' }}>
                  <label style={{ display:'block', color:C.mid, fontSize:12, fontWeight:600, marginBottom:5 }}>
                    {modal === 'edit-user' ? 'New Password' : 'Password *'}
                    {modal === 'edit-user' && <span style={{ color:C.faint, fontWeight:400, fontSize:11, marginLeft:6 }}>(leave blank to keep)</span>}
                  </label>
                  <div style={{ position:'relative' }}>
                    <Lock size={14} color={C.muted} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
                    <input type={showPass?'text':'password'} value={userForm.password} onChange={e => setUF('password')(e.target.value)}
                      placeholder={modal === 'edit-user' ? 'Leave blank to keep' : 'Set password'}
                      style={{ width:'100%', padding:'10px 40px 10px 36px', border: userForm.password ? '1.5px solid '+C.green : BORDER, borderRadius:8, fontSize:13, color:C.navy, outline:'none', boxSizing:'border-box' }} />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.faint, display:'flex' }}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ color:C.navy, fontWeight:700, fontSize:13, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Shield size={13} color="#1E3A5F" />
                </div>
                Assign Role
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                <div onClick={() => setUserForm(f => ({ ...f, is_admin:true, role_id:'' }))}
                  style={{ padding:14, borderRadius:10, cursor:'pointer', border:'2px solid '+(userForm.is_admin?'#1E3A5F':'#E2E8F0'), background: userForm.is_admin?'#1E3A5F08':C.bg, transition:'all .15s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <Shield size={18} color={userForm.is_admin?'#1E3A5F':C.muted} />
                    <span style={{ color: userForm.is_admin?'#1E3A5F':C.muted, fontWeight:700, fontSize:14 }}>Admin</span>
                    {userForm.is_admin && <Check size={14} color="#1E3A5F" style={{ marginLeft:'auto' }} />}
                  </div>
                  <div style={{ color:C.faint, fontSize:11 }}>Full access to all pages</div>
                </div>

                {roles.map(role => {
                  const isSelected = String(userForm.role_id) === String(role.id) && !userForm.is_admin
                  return (
                    <div key={role.id}
                      onClick={() => setUserForm(f => ({ ...f, is_admin:false, role_id: String(role.id), permissions: role.permissions }))}
                      style={{ padding:14, borderRadius:10, cursor:'pointer', border:'2px solid '+(isSelected?C.accent:'#E2E8F0'), background: isSelected?C.accentL:C.bg, transition:'all .15s' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <User size={18} color={isSelected?C.accent:C.muted} />
                        <span style={{ color: isSelected?C.accent:C.muted, fontWeight:700, fontSize:14 }}>{role.name}</span>
                        {isSelected && <Check size={14} color={C.accent} style={{ marginLeft:'auto' }} />}
                      </div>
                      <div style={{ color:C.faint, fontSize:11 }}>
                        {role.permissions.length} pages: {role.permissions.slice(0,2).map(p => ALL_PAGES.find(x => x.key===p)?.label).join(', ')}{role.permissions.length>2?'…':''}
                      </div>
                    </div>
                  )
                })}

                <div onClick={() => { setTab('roles'); openAddRole(); setModal(null) }}
                  style={{ padding:14, borderRadius:10, cursor:'pointer', border:'2px dashed #E2E8F0', background:C.bg, display:'flex', alignItems:'center', gap:8, transition:'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.background=C.accentL }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.background=C.bg }}>
                  <Plus size={16} color={C.accent} />
                  <span style={{ color:C.accent, fontWeight:600, fontSize:13 }}>Create New Role</span>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <Btn onClick={() => { setModal(null); setUserForm(INIT_USER) }}>Cancel</Btn>
              <Btn variant="primary" onClick={saveUser} disabled={saving||!userForm.username||!userForm.email}>
                {saving ? <><Spinner size={14} color="white" /> Saving…</> : <><Check size={14} />{modal==='add-user'?'Create User':'Save Changes'}</>}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════
          ADD / EDIT ROLE MODAL — permission picker now grouped into sections
      ══════════════════════════════════════════════════════════ */}
      {modal === 'add-role' && (
        <Modal
          title={editRoleId ? 'Edit Role' : 'Create New Role'}
          onClose={() => { setModal(null); setRoleForm(INIT_ROLE); setEditRoleId(null) }}
          wide>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', color:C.mid, fontSize:12, fontWeight:600, marginBottom:5 }}>Role Name *</label>
            <input type="text" value={roleForm.name} onChange={e => setRF('name')(e.target.value)}
              placeholder="e.g. Manager, Supervisor, Fleet Officer"
              style={{ width:'100%', padding:'10px 12px', border:BORDER, borderRadius:8, fontSize:14, color:C.navy, outline:'none', boxSizing:'border-box' }} />
            <div style={{ color:C.faint, fontSize:11, marginTop:4 }}>This name appears as the user role badge</div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <label style={{ color:C.mid, fontSize:12, fontWeight:600 }}>
                Page Permissions
                <span style={{ color:C.faint, fontWeight:400, marginLeft:6 }}>{roleForm.permissions.length}/{ALL_PAGES.length} pages</span>
              </label>
              <div style={{ display:'flex', gap:6 }}>
                <Btn variant="ghost" style={{ fontSize:11, padding:'3px 10px', background:C.accentL, color:C.accent }}
                  onClick={() => setRoleForm(f => ({ ...f, permissions: ALL_PAGES.map(p => p.key) }))}>
                  <Check size={11} /> All
                </Btn>
                <Btn variant="ghost" style={{ fontSize:11, padding:'3px 10px' }}
                  onClick={() => setRoleForm(f => ({ ...f, permissions: [] }))}>
                  Clear
                </Btn>
              </div>
            </div>
            <GroupedPermissionPicker
              permissions={roleForm.permissions}
              onToggle={toggleRolePerm}
              onToggleSection={toggleRoleSection}
            />
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn onClick={() => { setModal(null); setRoleForm(INIT_ROLE); setEditRoleId(null) }}>Cancel</Btn>
            <Btn variant="primary" onClick={saveRole} disabled={!roleForm.name}>
              <Check size={14} /> {editRoleId ? 'Save Changes' : 'Create Role'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW USER MODAL — Page Access now grouped
      ══════════════════════════════════════════════════════════ */}
      {modal === 'view' && viewU && (
        <Modal title="User Details" onClose={() => setModal(null)}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20, padding:16, background:C.bg, borderRadius:12 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background: viewU.role==='admin'?'#1E3A5F':C.accentL, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {viewU.role==='admin' ? <Shield size={24} color="white" /> : <User size={24} color={C.accent} />}
            </div>
            <div>
              <div style={{ color:C.navy, fontWeight:700, fontSize:17 }}>{viewU.username}</div>
              <div style={{ color:C.muted, fontSize:13 }}>{viewU.email}</div>
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                <RoleBadge name={viewU.name} isAdmin={viewU.role==='admin'} />
                <Badge status={viewU.status==='active'?'online':'offline'} label={viewU.status} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ color:C.navy, fontWeight:700, fontSize:13, marginBottom:10 }}>Page Access</div>
            {viewU.role === 'admin' ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:12, background:'#1E3A5F08', border:'1px solid #1E3A5F20', borderRadius:10 }}>
                <Shield size={16} color="#1E3A5F" />
                <span style={{ color:'#1E3A5F', fontWeight:600, fontSize:13 }}>Full access to all pages</span>
              </div>
            ) : (
              <GroupedPermissionBadges permissions={Array.isArray(viewU.permissions) ? viewU.permissions : []} compact />
            )}
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn onClick={() => openEditUser(viewU)}><Edit size={13} /> Edit</Btn>
            <Btn onClick={() => setModal(null)}>Close</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}