import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import {
  LayoutDashboard, Map, Car, Clock, AlertTriangle, User, Hexagon, FileText,
  Cpu, Users, Settings, Plus, Search, Filter, Edit, Trash2, Eye, Download,
  X, CheckCircle, ChevronDown, ChevronRight, Wifi, WifiOff, Zap, ZapOff,
  Battery, Navigation, Gauge, MapPin, Play, Pause, SkipBack, SkipForward,
  Bell, MoreVertical, ArrowUp, ArrowDown, Activity, AlertCircle, Shield,
  Phone, Bike, RefreshCw, Info, XCircle, Check, ChevronLeft, Signal,
  Globe, Layers, Circle, TrendingUp, Square, BarChart2, Route, Key,
} from "lucide-react";

const C = {
  sidebar:"#0F172A",sidebarHover:"#1E293B",sidebarActive:"#1E293B",
  bg:"#F1F5F9",card:"#FFFFFF",border:"#E2E8F0",
  accent:"#2563EB",accentL:"#EFF6FF",accentB:"#BFDBFE",
  navy:"#0F172A",mid:"#334155",muted:"#64748B",faint:"#94A3B8",
  green:"#059669",greenL:"#ECFDF5",greenB:"#A7F3D0",
  red:"#DC2626",redL:"#FEF2F2",redB:"#FECACA",
  amber:"#D97706",amberL:"#FFFBEB",amberB:"#FDE68A",
  purple:"#7C3AED",purpleL:"#F5F3FF",
  blue:"#0EA5E9",blueL:"#F0F9FF",
};

const INIT_VEHICLES = [
  { id:1,  name:"Toyota Camry 001",   type:"car",       plate:"2A-1234", brand:"Toyota",   model:"Camry 2022",   driverId:1, driver:"Dara Sok",    imei:"356938035643809", status:"moving",  speed:52, direction:"NE", ignition:true,  battery:87, signal:4, lat:11.5564, lng:104.9282, lastUpdate:"19:30:05", location:"St. 271, Phnom Penh" },
  { id:2,  name:"Honda Wave 001",     type:"motorbike", plate:"1B-5678", brand:"Honda",    model:"Wave 125",     driverId:2, driver:"Sopha Chan",  imei:"490154203237518", status:"stopped", speed:0,  direction:"S",  ignition:false, battery:62, signal:3, lat:11.5620, lng:104.9180, lastUpdate:"19:28:12", location:"BKK, Phnom Penh" },
  { id:3,  name:"Lexus RX 001",       type:"car",       plate:"3C-9012", brand:"Lexus",    model:"RX350 2023",   driverId:3, driver:"Kanha Pich",  imei:"012345678901234", status:"moving",  speed:71, direction:"W",  ignition:true,  battery:91, signal:4, lat:11.5490, lng:104.9350, lastUpdate:"19:30:08", location:"Toul Kork, PP" },
  { id:4,  name:"Yamaha Exciter 001", type:"motorbike", plate:"2D-3456", brand:"Yamaha",   model:"Exciter 150",  driverId:4, driver:"Virak Ly",    imei:"359785029035978", status:"offline", speed:0,  direction:"E",  ignition:false, battery:34, signal:0, lat:11.5700, lng:104.9400, lastUpdate:"18:45:22", location:"Daun Penh, PP" },
  { id:5,  name:"Honda CR-V 001",     type:"car",       plate:"4E-7890", brand:"Honda",    model:"CR-V 2023",    driverId:5, driver:"Rathana Kim", imei:"867920039358426", status:"moving",  speed:38, direction:"N",  ignition:true,  battery:78, signal:4, lat:11.5530, lng:104.9250, lastUpdate:"19:30:02", location:"7 Makara, PP" },
  { id:6,  name:"Kawasaki Z001",      type:"motorbike", plate:"5F-2345", brand:"Kawasaki", model:"Z300",         driverId:1, driver:"Dara Sok",    imei:"350751792468189", status:"stopped", speed:0,  direction:"NW", ignition:true,  battery:55, signal:3, lat:11.5450, lng:104.9150, lastUpdate:"19:25:45", location:"Chamkar Mon, PP" },
  { id:7,  name:"Toyota Hilux 001",   type:"car",       plate:"6G-3456", brand:"Toyota",   model:"Hilux 2022",   driverId:2, driver:"Sopha Chan",  imei:"358748093698001", status:"online",  speed:0,  direction:"S",  ignition:false, battery:92, signal:4, lat:11.5600, lng:104.9350, lastUpdate:"19:29:58", location:"Russey Keo, PP" },
  { id:8,  name:"Honda PCX 001",      type:"motorbike", plate:"7H-7890", brand:"Honda",    model:"PCX 150",      driverId:3, driver:"Kanha Pich",  imei:"359834726519083", status:"moving",  speed:29, direction:"SE", ignition:true,  battery:71, signal:4, lat:11.5470, lng:104.9220, lastUpdate:"19:30:01", location:"Meanchey, PP" },
  { id:9,  name:"Mazda CX-5 001",     type:"car",       plate:"8I-1234", brand:"Mazda",    model:"CX-5 2022",    driverId:4, driver:"Virak Ly",    imei:"356938035111111", status:"moving",  speed:44, direction:"NW", ignition:true,  battery:88, signal:4, lat:11.5610, lng:104.9300, lastUpdate:"19:30:03", location:"Sen Sok, PP" },
  { id:10, name:"Suzuki Raider 001",  type:"motorbike", plate:"9J-5678", brand:"Suzuki",   model:"Raider 150",   driverId:5, driver:"Rathana Kim", imei:"490154203222222", status:"stopped", speed:0,  direction:"E",  ignition:false, battery:45, signal:2, lat:11.5540, lng:104.9420, lastUpdate:"19:20:18", location:"Por Sen Chey, PP" },
];

const INIT_DRIVERS = [
  { id:1, name:"Dara Sok",    phone:"012-345-678", license:"B-123456", licenseExpiry:"2027-06-15", vehicleId:1, vehicle:"Toyota Camry 001",   status:"active"   },
  { id:2, name:"Sopha Chan",  phone:"015-234-567", license:"B-234567", licenseExpiry:"2026-12-20", vehicleId:2, vehicle:"Honda Wave 001",     status:"active"   },
  { id:3, name:"Kanha Pich",  phone:"017-345-678", license:"B-345678", licenseExpiry:"2028-03-10", vehicleId:3, vehicle:"Lexus RX 001",       status:"active"   },
  { id:4, name:"Virak Ly",    phone:"010-456-789", license:"B-456789", licenseExpiry:"2025-09-30", vehicleId:4, vehicle:"Yamaha Exciter 001", status:"inactive" },
  { id:5, name:"Rathana Kim", phone:"016-567-890", license:"B-567890", licenseExpiry:"2027-11-05", vehicleId:5, vehicle:"Honda CR-V 001",     status:"active"   },
];

const INIT_ALERTS = [
  { id:1, type:"overspeed",    vehicle:"Toyota Camry 001",  datetime:"2026-09-08 19:30:05", location:"St. 271, PP",    speed:82,   status:"unread", description:"Speed 82 km/h exceeded limit 80 km/h" },
  { id:2, type:"geofence_in",  vehicle:"Honda Wave 001",    datetime:"2026-09-08 19:28:00", location:"BKK, PP",        speed:null, status:"unread", description:"Entered geofence: Office Zone" },
  { id:3, type:"gps_offline",  vehicle:"Yamaha Exciter 001",datetime:"2026-09-08 18:45:22", location:"Daun Penh, PP",  speed:null, status:"read",   description:"GPS signal lost for 15 minutes" },
  { id:4, type:"ignition_on",  vehicle:"Toyota Hilux 001",  datetime:"2026-09-08 07:15:00", location:"Russey Keo, PP", speed:null, status:"read",   description:"Ignition turned ON" },
  { id:5, type:"low_battery",  vehicle:"Yamaha Exciter 001",datetime:"2026-09-08 18:00:00", location:"Daun Penh, PP",  speed:null, status:"unread", description:"Battery level 34% below threshold" },
  { id:6, type:"overspeed",    vehicle:"Lexus RX 001",      datetime:"2026-09-08 19:00:00", location:"Toul Kork, PP",  speed:95,   status:"unread", description:"Speed 95 km/h exceeded limit 80 km/h" },
  { id:7, type:"long_stop",    vehicle:"Kawasaki Z001",     datetime:"2026-09-08 18:30:00", location:"Chamkar Mon, PP",speed:null, status:"read",   description:"Vehicle stopped for more than 2 hours" },
  { id:8, type:"geofence_out", vehicle:"Honda CR-V 001",    datetime:"2026-09-08 17:45:00", location:"7 Makara, PP",   speed:null, status:"read",   description:"Exited geofence: City Boundary" },
];

const INIT_DEVICES = [
  { id:1, imei:"356938035643809", model:"Teltonika FMB920", sim:"012-111-2222", vehicleId:1, vehicle:"Toyota Camry 001",   gpsStatus:"online",  lastConnection:"19:30:05", lastUpdate:"19:30:05", protocol:"GT06"      },
  { id:2, imei:"490154203237518", model:"Concox GT06N",     sim:"015-222-3333", vehicleId:2, vehicle:"Honda Wave 001",     gpsStatus:"online",  lastConnection:"19:28:12", lastUpdate:"19:28:12", protocol:"GT06"      },
  { id:3, imei:"012345678901234", model:"TK103B",           sim:"017-333-4444", vehicleId:3, vehicle:"Lexus RX 001",       gpsStatus:"online",  lastConnection:"19:30:08", lastUpdate:"19:30:08", protocol:"TK103"     },
  { id:4, imei:"359785029035978", model:"Teltonika FMB010", sim:"010-444-5555", vehicleId:4, vehicle:"Yamaha Exciter 001", gpsStatus:"offline", lastConnection:"18:45:22", lastUpdate:"18:45:22", protocol:"Teltonika" },
  { id:5, imei:"867920039358426", model:"Concox AT4",       sim:"016-555-6666", vehicleId:5, vehicle:"Honda CR-V 001",     gpsStatus:"online",  lastConnection:"19:30:02", lastUpdate:"19:30:02", protocol:"GT06"      },
];

const INIT_USERS = [
  { id:1, name:"Admin KVH",    email:"admin@kvh.com",  role:"admin", status:"active",   lastLogin:"2026-09-08 08:00", permissions:["all"]                              },
  { id:2, name:"Staff Dara",   email:"dara@kvh.com",   role:"staff", status:"active",   lastLogin:"2026-09-08 09:30", permissions:["live","vehicles","history"]         },
  { id:3, name:"Staff Sopha",  email:"sopha@kvh.com",  role:"staff", status:"active",   lastLogin:"2026-09-08 10:15", permissions:["live","alerts"]                    },
  { id:4, name:"Manager Pich", email:"pich@kvh.com",   role:"staff", status:"inactive", lastLogin:"2026-09-07 17:00", permissions:["reports","drivers"]                },
];

const INIT_GEOFENCES = [
  { id:1, name:"Office Zone",    type:"circle", center:{lat:11.5564,lng:104.9282}, radius:500,  enabled:true,  alertEntry:true,  alertExit:true  },
  { id:2, name:"City Boundary",  type:"circle", center:{lat:11.5620,lng:104.9180}, radius:5000, enabled:true,  alertEntry:false, alertExit:true  },
  { id:3, name:"Warehouse Area", type:"circle", center:{lat:11.5490,lng:104.9350}, radius:300,  enabled:false, alertEntry:true,  alertExit:false },
];

const STATUS_COLOR = { moving:"#059669", stopped:"#D97706", online:"#2563EB", offline:"#6B7280" };
const STATUS_BG    = { moving:"#ECFDF5", stopped:"#FFFBEB", online:"#EFF6FF", offline:"#F8FAFC" };
const ALERT_COLOR  = { overspeed:"#DC2626",geofence_in:"#7C3AED",geofence_out:"#7C3AED",gps_offline:"#6B7280",ignition_on:"#059669",ignition_off:"#D97706",low_battery:"#EF4444",long_stop:"#F59E0B" };
const ALERT_LABEL  = { overspeed:"Overspeed",geofence_in:"Geofence In",geofence_out:"Geofence Out",gps_offline:"GPS Offline",ignition_on:"Ignition ON",ignition_off:"Ignition OFF",low_battery:"Low Battery",long_stop:"Long Stop" };

// ── UI Components ──────────────────────────────────────────────────────────────
function Btn({ children, variant="secondary", onClick, style={}, disabled=false }) {
  const styles = {
    primary:  { background:C.accent,  color:"#fff", boxShadow:`0 2px 8px ${C.accent}30` },
    danger:   { background:C.red,     color:"#fff", boxShadow:`0 2px 8px ${C.red}30`    },
    ghost:    { background:"transparent", color:C.muted, boxShadow:"none", padding:"6px 10px" },
    secondary:{ background:C.card,    color:C.mid,  border:`1px solid ${C.border}`, boxShadow:"none" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600, cursor:disabled?"not-allowed":"pointer", border:"none", transition:"all .15s", opacity:disabled?.5:1, ...styles[variant], ...style }}>
      {children}
    </button>
  );
}

function Badge({ status, label, size=12 }) {
  const c = STATUS_COLOR[status]||C.accent, bg = STATUS_BG[status]||C.accentL;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:20, background:bg, color:c, fontSize:size, fontWeight:600, border:`1px solid ${c}30` }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c, display:"inline-block" }} />
      {label||status}
    </span>
  );
}

function AlertBadge({ type }) {
  const c = ALERT_COLOR[type]||C.accent;
  return <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:20, background:`${c}15`, color:c, fontSize:11, fontWeight:600, border:`1px solid ${c}30` }}>{ALERT_LABEL[type]||type}</span>;
}

function Card({ children, style={} }) {
  return <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,.04)", ...style }}>{children}</div>;
}

function Input({ placeholder, value, onChange, icon, style={} }) {
  return (
    <div style={{ position:"relative", ...style }}>
      {icon && <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.faint }}>{icon}</span>}
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", padding:`9px ${icon?"9px 9px 9px 34px":"9px 12px"}`, border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, color:C.navy, background:C.card, outline:"none", boxSizing:"border-box" }} />
    </div>
  );
}

function Select({ value, onChange, options, style={} }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, color:C.navy, background:C.card, outline:"none", cursor:"pointer", ...style }}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function StatCard({ label, value, Icon, color, trend, sub }) {
  return (
    <Card style={{ padding:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ color:C.muted, fontSize:12, fontWeight:500, marginBottom:6 }}>{label}</div>
          <div style={{ color:C.navy, fontSize:28, fontWeight:800, lineHeight:1 }}>{value}</div>
          {sub && <div style={{ color:C.faint, fontSize:11, marginTop:4 }}>{sub}</div>}
        </div>
        <div style={{ width:44, height:44, borderRadius:12, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon size={22} color={color} />
        </div>
      </div>
      {trend!==undefined && (
        <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
          {trend>=0 ? <TrendingUp size={13} color={C.green} /> : <ArrowDown size={13} color={C.red} />}
          <span style={{ fontSize:11, color:trend>=0?C.green:C.red, fontWeight:600 }}>{Math.abs(trend)}% today</span>
        </div>
      )}
    </Card>
  );
}

function Modal({ title, onClose, children, wide=false }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <Card style={{ width:wide?700:480, maxHeight:"90vh", overflow:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px 16px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ color:C.navy, fontSize:16, fontWeight:700 }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.faint, display:"flex", padding:4 }}><X size={18} /></button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </Card>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type="text" }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", color:C.mid, fontSize:12, fontWeight:600, marginBottom:5 }}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, color:C.navy, outline:"none", boxSizing:"border-box" }} />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", color:C.mid, fontSize:12, fontWeight:600, marginBottom:5 }}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, color:C.navy, outline:"none", background:"white" }}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function PageHeader({ title, subtitle, children }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
      <div>
        <div style={{ color:C.navy, fontSize:20, fontWeight:700 }}>{title}</div>
        {subtitle && <div style={{ color:C.faint, fontSize:13, marginTop:2 }}>{subtitle}</div>}
      </div>
      <div style={{ display:"flex", gap:8 }}>{children}</div>
    </div>
  );
}

function Table({ columns, rows, onAction }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:`2px solid ${C.border}` }}>
            {columns.map(c=><th key={c.key} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, fontSize:11, whiteSpace:"nowrap" }}>{c.label}</th>)}
            {onAction && <th style={{ padding:"10px 14px", color:C.muted, fontWeight:600, fontSize:11 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={row.id||i} style={{ borderBottom:`1px solid ${C.border}` }}
              onMouseEnter={e=>e.currentTarget.style.background=C.bg}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              {columns.map(c=>(
                <td key={c.key} style={{ padding:"11px 14px", color:C.mid, whiteSpace:"nowrap" }}>
                  {c.render ? c.render(row[c.key],row) : row[c.key]}
                </td>
              ))}
              {onAction && <td style={{ padding:"11px 14px" }}><div style={{ display:"flex", gap:4 }}>{onAction(row)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length===0 && <div style={{ textAlign:"center", padding:40, color:C.faint, fontSize:13 }}>No records found</div>}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard", label:"Dashboard",        Icon:LayoutDashboard },
  { id:"live",      label:"Live Tracking",    Icon:Map             },
  { id:"vehicles",  label:"Vehicles",         Icon:Car             },
  { id:"history",   label:"History / Playback",Icon:Clock          },
  { id:"alerts",    label:"Alerts",           Icon:AlertTriangle   },
  { id:"drivers",   label:"Drivers",          Icon:User            },
  { id:"geofences", label:"Geofences",        Icon:Hexagon         },
  { id:"reports",   label:"Reports",          Icon:FileText        },
  { id:"devices",   label:"GPS Devices",      Icon:Cpu             },
  { id:"users",     label:"Users",            Icon:Users           },
  { id:"settings",  label:"Settings",         Icon:Settings        },
];

function Sidebar({ current, onNav, unread }) {
  return (
    <div style={{ width:240, minWidth:240, background:C.sidebar, display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden" }}>
      <div style={{ padding:"20px 18px 16px", borderBottom:"1px solid #1E293B" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ background:C.accent, borderRadius:10, padding:8, display:"flex" }}>
            <Navigation size={16} color="white" />
          </div>
          <div>
            <div style={{ color:"white", fontWeight:700, fontSize:14 }}>KVH GPS Tracker</div>
            <div style={{ color:"#475569", fontSize:10 }}>Fleet Management</div>
          </div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"10px 10px" }}>
        {NAV.map(({ id,label,Icon })=>{
          const active = current===id;
          return (
            <button key={id} onClick={()=>onNav(id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, border:"none", cursor:"pointer", marginBottom:2, textAlign:"left", background:active?"#1E3A5F":"transparent", borderLeft:active?`3px solid ${C.accent}`:"3px solid transparent", transition:"all .15s" }}
              onMouseEnter={e=>{ if(!active) e.currentTarget.style.background="#1E293B"; }}
              onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
              <Icon size={16} color={active?C.accent:"#64748B"} />
              <span style={{ color:active?"white":"#94A3B8", fontSize:13, fontWeight:active?600:400, flex:1 }}>{label}</span>
              {id==="alerts" && unread>0 && (
                <span style={{ background:C.red, color:"white", borderRadius:20, padding:"1px 7px", fontSize:10, fontWeight:700 }}>{unread}</span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ padding:"12px 18px", borderTop:"1px solid #1E293B" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:"#1E293B", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <User size={14} color="#64748B" />
          </div>
          <div>
            <div style={{ color:"white", fontSize:12, fontWeight:600 }}>Admin KVH</div>
            <div style={{ color:"#475569", fontSize:10 }}>Administrator</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function Header({ title, unread, onAlerts }) {
  return (
    <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
      <div style={{ color:C.navy, fontSize:17, fontWeight:700 }}>{title}</div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ color:C.faint, fontSize:12 }}>Asia/Phnom_Penh · {new Date().toLocaleTimeString("en-US",{hour12:false})}</div>
        <button onClick={onAlerts} style={{ position:"relative", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 10px", cursor:"pointer", display:"flex" }}>
          <Bell size={16} color={C.muted} />
          {unread>0 && <span style={{ position:"absolute", top:-4, right:-4, background:C.red, color:"white", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700 }}>{unread}</span>}
        </button>
        <div style={{ width:32, height:32, borderRadius:"50%", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <User size={15} color="white" />
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
const chartData = {
  trips:   [{d:"Mon",v:12},{d:"Tue",v:19},{d:"Wed",v:15},{d:"Thu",v:22},{d:"Fri",v:18},{d:"Sat",v:8},{d:"Sun",v:5}],
  distance:[{d:"Mon",v:142},{d:"Tue",v:198},{d:"Wed",v:165},{d:"Thu",v:231},{d:"Fri",v:188},{d:"Sat",v:95},{d:"Sun",v:62}],
  status:  [{name:"Moving",v:4},{name:"Stopped",v:3},{name:"Online",v:1},{name:"Offline",v:2}],
  alerts:  [{name:"Overspeed",v:8},{name:"Geofence",v:5},{name:"Offline",v:3},{name:"Battery",v:4},{name:"Stop",v:2}],
};
const PIE_COLORS = ["#059669","#D97706","#2563EB","#6B7280"];

function Dashboard({ vehicles, alerts }) {
  const s = {
    total:   vehicles.length,
    online:  vehicles.filter(v=>v.status!=="offline").length,
    offline: vehicles.filter(v=>v.status==="offline").length,
    moving:  vehicles.filter(v=>v.status==="moving").length,
    stopped: vehicles.filter(v=>v.status==="stopped").length,
    alerts:  alerts.filter(a=>a.status==="unread").length,
  };
  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:16, marginBottom:24 }}>
        <StatCard label="Total Vehicles" value={s.total}   Icon={Car}           color={C.accent} trend={2}  />
        <StatCard label="Online"         value={s.online}  Icon={Wifi}          color={C.green}  trend={5}  />
        <StatCard label="Offline"        value={s.offline} Icon={WifiOff}       color={C.muted}  trend={-1} />
        <StatCard label="Moving"         value={s.moving}  Icon={Navigation}    color={C.blue}   trend={8}  />
        <StatCard label="Stopped"        value={s.stopped} Icon={Square}        color={C.amber}  trend={-3} />
        <StatCard label="Active Alerts"  value={s.alerts}  Icon={AlertTriangle} color={C.red}    trend={-2} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }}>
        <Card style={{ padding:20 }}>
          <div style={{ color:C.navy, fontWeight:700, marginBottom:16 }}>Daily Trips</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData.trips}><XAxis dataKey="d" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} /><Tooltip /><Bar dataKey="v" fill={C.accent} radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding:20 }}>
          <div style={{ color:C.navy, fontWeight:700, marginBottom:16 }}>Vehicle Status</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart><Pie data={chartData.status} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,v})=>`${name}:${v}`}>
              {chartData.status.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <Card style={{ padding:20 }}>
          <div style={{ color:C.navy, fontWeight:700, marginBottom:16 }}>Distance Traveled (km)</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData.distance}><XAxis dataKey="d" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} /><Tooltip /><Area type="monotone" dataKey="v" fill={C.accentL} stroke={C.accent} strokeWidth={2} /></AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding:20 }}>
          <div style={{ color:C.navy, fontWeight:700, marginBottom:16 }}>Alerts by Type</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData.alerts} layout="vertical"><XAxis type="number" tick={{fontSize:11}} /><YAxis dataKey="name" type="category" width={70} tick={{fontSize:11}} /><Tooltip /><Bar dataKey="v" fill={C.red} radius={[0,4,4,0]} /></BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card style={{ padding:20 }}>
        <div style={{ color:C.navy, fontWeight:700, marginBottom:14 }}>Recent Alerts</div>
        <Table
          columns={[
            { key:"type",    label:"Type",     render:v=><AlertBadge type={v} /> },
            { key:"vehicle", label:"Vehicle"   },
            { key:"datetime",label:"Date/Time" },
            { key:"location",label:"Location"  },
            { key:"status",  label:"Status",   render:v=><Badge status={v==="read"?"online":"stopped"} label={v} /> },
          ]}
          rows={alerts.slice(0,5)}
        />
      </Card>
    </div>
  );
}

// ── Live Tracking ──────────────────────────────────────────────────────────────
const LIVE_STYLE = [
  { featureType:"water",     elementType:"geometry",        stylers:[{color:"#BFDBFE"}] },
  { featureType:"landscape", elementType:"geometry",        stylers:[{color:"#F0F7FF"}] },
  { featureType:"road",      elementType:"geometry",        stylers:[{color:"#FFFFFF"}] },
  { featureType:"road",      elementType:"geometry.stroke", stylers:[{color:"#BFDBFE"}] },
  { featureType:"poi",       elementType:"geometry",        stylers:[{color:"#DBEAFE"}] },
  { elementType:"labels.text.stroke", stylers:[{color:"#FFFFFF"}] },
  { elementType:"labels.text.fill",   stylers:[{color:"#3B6A9A"}] },
];

function LiveTracking({ vehicles }) {
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");
  const [selected,setSelected]= useState(null);
  const [apiKey,  setApiKey]  = useState("");
  const [keyInput,setKeyInput]= useState("");
  const [mapReady,setMapReady]= useState(false);
  const mapEl    = useRef(null);
  const gmapRef  = useRef(null);
  const markersRef  = useRef({});
  const infoWinRef  = useRef(null);

  const buildInfo = v=>`
    <div style="font-family:system-ui;padding:14px;min-width:220px;font-size:13px">
      <div style="font-weight:700;font-size:15px;color:#0F172A;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #E2E8F0">
        ${v.type==="car"?"🚗":"🏍️"} ${v.name}
      </div>
      ${[["Plate",v.plate],["Driver",v.driver],["IMEI",v.imei],["Speed",`${v.speed} km/h`],["Direction",v.direction],["Ignition",v.ignition?"ON 🟢":"OFF 🔴"],["Battery",`${v.battery}%`],["Last Update",v.lastUpdate],["Location",v.location]]
        .map(([l,val])=>`<div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="color:#64748B;font-size:11px">${l}</span><span style="color:#0F172A;font-weight:500;font-size:11px">${val}</span></div>`).join("")}
    </div>`;

  const initMap = useCallback(()=>{
    if(!mapEl.current||!window.google?.maps||gmapRef.current) return;
    gmapRef.current = new window.google.maps.Map(mapEl.current,{ center:{lat:11.5564,lng:104.9282}, zoom:13, streetViewControl:false, styles:LIVE_STYLE });
    infoWinRef.current = new window.google.maps.InfoWindow();
    setMapReady(true);
  },[]);

  useEffect(()=>{
    if(!mapReady||!window.google?.maps) return;
    vehicles.forEach(v=>{
      if(!markersRef.current[v.id]){
        const marker = new window.google.maps.Marker({
          position:{lat:v.lat,lng:v.lng}, map:gmapRef.current, title:v.name,
          icon:{ path:window.google.maps.SymbolPath.CIRCLE, scale:13, fillColor:v.status==="moving"?C.green:v.status==="offline"?C.muted:C.accent, fillOpacity:1, strokeColor:"white", strokeWeight:2.5 },
          label:{ text:v.type==="car"?"C":"M", color:"white", fontSize:"10px", fontWeight:"bold" },
        });
        marker.addListener("click",()=>{ infoWinRef.current.setContent(buildInfo(v)); infoWinRef.current.open(gmapRef.current,marker); setSelected(v); });
        markersRef.current[v.id] = marker;
      } else {
        markersRef.current[v.id].setPosition({lat:v.lat,lng:v.lng});
        markersRef.current[v.id].setIcon({ path:window.google.maps.SymbolPath.CIRCLE, scale:13, fillColor:v.status==="moving"?C.green:v.status==="offline"?C.muted:C.accent, fillOpacity:1, strokeColor:"white", strokeWeight:2.5 });
      }
    });
  },[vehicles,mapReady]);

  const loadMaps = key=>{
    if(window.google?.maps){ initMap(); return; }
    window.__liveInit = ()=>initMap();
    const s=document.createElement("script");
    s.src=`https://maps.googleapis.com/maps/api/js?key=${key}&callback=__liveInit`;
    s.async=true; s.defer=true; document.head.appendChild(s);
  };

  const filtered = vehicles.filter(v=>{
    const q=search.toLowerCase();
    const ok=!q||v.name.toLowerCase().includes(q)||v.plate.toLowerCase().includes(q)||v.driver.toLowerCase().includes(q)||v.imei.includes(q);
    const okF=filter==="all"||v.status===filter||v.type===filter;
    return ok&&okF;
  });

  const focus = v=>{
    setSelected(v);
    if(gmapRef.current&&window.google?.maps){ gmapRef.current.panTo({lat:v.lat,lng:v.lng}); gmapRef.current.setZoom(16); if(markersRef.current[v.id]){ infoWinRef.current.setContent(buildInfo(v)); infoWinRef.current.open(gmapRef.current,markersRef.current[v.id]); } }
  };

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      <div style={{ width:280, minWidth:280, background:C.card, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:12, borderBottom:`1px solid ${C.border}` }}>
          <Input placeholder="Search vehicles…" value={search} onChange={setSearch} icon={<Search size={13} />} style={{ marginBottom:8 }} />
          <Select value={filter} onChange={setFilter} style={{ width:"100%", fontSize:12 }}
            options={[{value:"all",label:"All Vehicles"},{value:"moving",label:"Moving"},{value:"stopped",label:"Stopped"},{value:"online",label:"Online"},{value:"offline",label:"Offline"},{value:"car",label:"Cars"},{value:"motorbike",label:"Motorbikes"}]} />
          <div style={{ display:"flex", gap:10, marginTop:8, flexWrap:"wrap" }}>
            {[["moving",C.green,"Moving"],["stopped",C.amber,"Stopped"],["offline",C.muted,"Offline"]].map(([s,c,l])=>(
              <div key={s} style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, color:C.muted }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:c }} />{l} {vehicles.filter(v=>v.status===s).length}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:8 }}>
          {filtered.map(v=>(
            <div key={v.id} onClick={()=>focus(v)}
              style={{ padding:"10px 11px", borderRadius:9, marginBottom:5, cursor:"pointer", background:selected?.id===v.id?C.accentL:C.bg, border:`1px solid ${selected?.id===v.id?C.accentB:C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                  <div style={{ fontSize:16 }}>{v.type==="car"?"🚗":"🏍️"}</div>
                  <div>
                    <div style={{ color:C.navy, fontWeight:600, fontSize:12 }}>{v.name}</div>
                    <div style={{ color:C.faint, fontSize:10 }}>{v.plate} · {v.driver}</div>
                  </div>
                </div>
                <Badge status={v.status} label={v.status} size={10} />
              </div>
              <div style={{ display:"flex", gap:10, marginTop:6, fontSize:10, color:C.muted }}>
                <span><Gauge size={10} /> {v.speed} km/h</span>
                <span>{v.ignition?"🟢":"🔴"} {v.ignition?"Ign ON":"Ign OFF"}</span>
                <span>🔋{v.battery}%</span>
              </div>
              <div style={{ color:C.faint, fontSize:10, marginTop:3 }}>⏱ {v.lastUpdate}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex:1, position:"relative" }}>
        {!apiKey && (
          <div style={{ position:"absolute", inset:0, background:"#F0F7FF", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}>
            <Card style={{ padding:32, width:380, textAlign:"center" }}>
              <MapPin size={40} color={C.accent} style={{ margin:"0 auto 12px" }} />
              <div style={{ color:C.navy, fontSize:18, fontWeight:700, marginBottom:8 }}>Google Maps API Key</div>
              <div style={{ color:C.muted, fontSize:13, marginBottom:20 }}>Required for live vehicle tracking on map.</div>
              <input value={keyInput} onChange={e=>setKeyInput(e.target.value)} placeholder="AIzaSy…"
                style={{ width:"100%", padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, outline:"none", marginBottom:12, boxSizing:"border-box", fontFamily:"monospace" }} />
              <Btn variant="primary" style={{ width:"100%", justifyContent:"center" }} onClick={()=>{ if(keyInput.trim()){ setApiKey(keyInput.trim()); loadMaps(keyInput.trim()); } }}>
                <Navigation size={15} /> Load Live Map
              </Btn>
            </Card>
          </div>
        )}
        <div ref={mapEl} style={{ width:"100%", height:"100%" }} />
        {apiKey && (
          <div style={{ position:"absolute", top:12, left:12, background:"rgba(255,255,255,.93)", backdropFilter:"blur(8px)", borderRadius:10, padding:"8px 14px", border:`1px solid ${C.border}`, display:"flex", gap:14, fontSize:12, color:C.mid }}>
            {[["moving",C.green,"Moving"],["stopped",C.amber,"Stopped"],["offline",C.muted,"Offline"]].map(([s,c,l])=>(
              <span key={s} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:c, boxShadow:s==="moving"?`0 0 5px ${c}`:"none" }} />
                {vehicles.filter(v=>v.status===s).length} {l}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Vehicles Page ──────────────────────────────────────────────────────────────
const V_INIT = { name:"",type:"car",plate:"",brand:"",model:"",driver:"",imei:"",status:"online" };

function VehiclesPage({ vehicles, setVehicles, drivers }) {
  const [search,setSearch]=useState(""); const [filter,setFilter]=useState("all");
  const [modal,setModal]=useState(null); const [form,setForm]=useState(V_INIT);
  const [viewV,setViewV]=useState(null);
  const setF=k=>v=>setForm(f=>({...f,[k]:v}));

  const filtered=vehicles.filter(v=>{ const q=search.toLowerCase(); const ok=!q||v.name.toLowerCase().includes(q)||v.plate.toLowerCase().includes(q)||v.driver.toLowerCase().includes(q)||v.imei.includes(q); const okF=filter==="all"||v.type===filter||v.status===filter; return ok&&okF; });

  const save=()=>{ if(modal==="add") setVehicles(prev=>[...prev,{...form,id:Date.now(),lat:11.5564,lng:104.9282,speed:0,direction:"N",ignition:false,battery:100,signal:4,lastUpdate:"Now",location:"Phnom Penh"}]); else setVehicles(prev=>prev.map(v=>v.id===form.id?{...v,...form}:v)); setModal(null); };
  const del=id=>{ if(window.confirm("Delete this vehicle?")) setVehicles(prev=>prev.filter(v=>v.id!==id)); };

  return (
    <div style={{ padding:24 }}>
      <PageHeader title="Vehicles" subtitle={`${vehicles.length} total vehicles`}>
        <Btn variant="primary" onClick={()=>{ setForm(V_INIT); setModal("add"); }}><Plus size={14} /> Add Vehicle</Btn>
      </PageHeader>
      <Card>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:10 }}>
          <Input placeholder="Search name, plate, IMEI, driver…" value={search} onChange={setSearch} icon={<Search size={13} />} style={{ flex:1 }} />
          <Select value={filter} onChange={setFilter} options={[{value:"all",label:"All"},{value:"car",label:"Cars"},{value:"motorbike",label:"Motorbikes"},{value:"moving",label:"Moving"},{value:"stopped",label:"Stopped"},{value:"offline",label:"Offline"}]} />
          <Btn onClick={()=>{ setSearch(""); setFilter("all"); }}><RefreshCw size={13} /></Btn>
        </div>
        <Table
          columns={[
            { key:"name",   label:"Vehicle",   render:(v,r)=><span style={{ fontWeight:600,color:C.navy }}>{r.type==="car"?"🚗":"🏍️"} {v}</span> },
            { key:"plate",  label:"Plate"      },
            { key:"brand",  label:"Brand/Model",render:(v,r)=>`${r.brand} ${r.model}` },
            { key:"driver", label:"Driver"     },
            { key:"imei",   label:"IMEI",      render:v=><code style={{ fontSize:11,color:C.muted }}>{v}</code> },
            { key:"status", label:"Status",    render:v=><Badge status={v} label={v} /> },
            { key:"speed",  label:"Speed",     render:v=>`${v} km/h` },
            { key:"battery",label:"Battery",   render:v=>`${v}%` },
          ]}
          rows={filtered}
          onAction={row=>[
            <Btn key="v" variant="ghost" onClick={()=>setViewV(row)}><Eye size={13} /></Btn>,
            <Btn key="e" variant="ghost" onClick={()=>{ setForm(row); setModal("edit"); }}><Edit size={13} /></Btn>,
            <Btn key="d" variant="ghost" onClick={()=>del(row.id)} style={{ color:C.red }}><Trash2 size={13} /></Btn>,
          ]}
        />
      </Card>
      {(modal==="add"||modal==="edit") && (
        <Modal title={modal==="add"?"Add Vehicle":"Edit Vehicle"} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            <FormInput label="Vehicle Name"   value={form.name}   onChange={setF("name")}   placeholder="Toyota Camry 001" />
            <FormSelect label="Type"          value={form.type}   onChange={setF("type")}   options={[{value:"car",label:"Car"},{value:"motorbike",label:"Motorbike"}]} />
            <FormInput label="Plate Number"   value={form.plate}  onChange={setF("plate")}  placeholder="2A-1234" />
            <FormInput label="Brand"          value={form.brand}  onChange={setF("brand")}  placeholder="Toyota" />
            <FormInput label="Model"          value={form.model}  onChange={setF("model")}  placeholder="Camry 2022" />
            <FormSelect label="Assign Driver" value={form.driver} onChange={setF("driver")} options={[{value:"",label:"Unassigned"},...drivers.map(d=>({value:d.name,label:d.name}))]} />
            <FormInput label="IMEI (15 digits)" value={form.imei} onChange={setF("imei")} placeholder="356938035643809" />
            <FormSelect label="Status"        value={form.status} onChange={setF("status")} options={[{value:"online",label:"Online"},{value:"offline",label:"Offline"}]} />
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}><Check size={14} /> Save</Btn>
          </div>
        </Modal>
      )}
      {viewV && (
        <Modal title="Vehicle Details" onClose={()=>setViewV(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[["Name",viewV.name],["Type",viewV.type],["Plate",viewV.plate],["Brand",viewV.brand],["Model",viewV.model],["Driver",viewV.driver],["IMEI",viewV.imei],["Status",viewV.status],["Speed",`${viewV.speed} km/h`],["Direction",viewV.direction],["Ignition",viewV.ignition?"ON":"OFF"],["Battery",`${viewV.battery}%`],["Last Update",viewV.lastUpdate],["Location",viewV.location]].map(([l,v])=>(
              <div key={l} style={{ background:C.bg, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ color:C.faint, fontSize:10, marginBottom:3 }}>{l}</div>
                <div style={{ color:C.navy, fontSize:13, fontWeight:600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign:"right", marginTop:16 }}><Btn onClick={()=>setViewV(null)}>Close</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ── History Page ───────────────────────────────────────────────────────────────
const ROUTE = [{lat:11.5564,lng:104.9282,time:"08:00",speed:0},{lat:11.5580,lng:104.9300,time:"08:05",speed:35},{lat:11.5610,lng:104.9330,time:"08:10",speed:52},{lat:11.5640,lng:104.9360,time:"08:15",speed:48},{lat:11.5660,lng:104.9400,time:"08:20",speed:61},{lat:11.5680,lng:104.9420,time:"08:25",speed:55},{lat:11.5700,lng:104.9440,time:"08:30",speed:42},{lat:11.5710,lng:104.9460,time:"08:35",speed:0}];

function HistoryPage({ vehicles }) {
  const [selV,setSelV]=useState(""); const [date,setDate]=useState("2026-09-08");
  const [tFrom,setTFrom]=useState("08:00"); const [tTo,setTTo]=useState("09:00");
  const [playing,setPlaying]=useState(false); const [idx,setIdx]=useState(0);
  const [apiKey,setApiKey]=useState(""); const [keyInput,setKeyInput]=useState("");
  const mapEl=useRef(null); const gmapRef=useRef(null); const markerRef=useRef(null);
  const polyRef=useRef(null); const timerRef=useRef(null);

  const initHistMap=key=>{ if(!mapEl.current||!window.google?.maps||gmapRef.current) return; gmapRef.current=new window.google.maps.Map(mapEl.current,{center:{lat:11.5600,lng:104.9360},zoom:14,streetViewControl:false,styles:LIVE_STYLE}); polyRef.current=new window.google.maps.Polyline({path:ROUTE,geodesic:true,strokeColor:C.accent,strokeOpacity:.8,strokeWeight:3,map:gmapRef.current}); new window.google.maps.Marker({position:ROUTE[0],map:gmapRef.current,label:{text:"S",color:"white"},icon:{path:window.google.maps.SymbolPath.CIRCLE,scale:12,fillColor:C.green,fillOpacity:1,strokeColor:"white",strokeWeight:2}}); new window.google.maps.Marker({position:ROUTE[ROUTE.length-1],map:gmapRef.current,label:{text:"E",color:"white"},icon:{path:window.google.maps.SymbolPath.CIRCLE,scale:12,fillColor:C.red,fillOpacity:1,strokeColor:"white",strokeWeight:2}}); markerRef.current=new window.google.maps.Marker({position:ROUTE[0],map:gmapRef.current,icon:{path:window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,scale:5,fillColor:C.amber,fillOpacity:1,strokeColor:"white",strokeWeight:2}}); };
  const loadHistMap=key=>{ if(window.google?.maps){initHistMap(key);return;} window.__histInit=()=>initHistMap(key); const s=document.createElement("script"); s.src=`https://maps.googleapis.com/maps/api/js?key=${key}&callback=__histInit`; s.async=true; s.defer=true; document.head.appendChild(s); };

  useEffect(()=>{ if(!playing){clearInterval(timerRef.current);return;} timerRef.current=setInterval(()=>{ setIdx(prev=>{ const n=prev+1; if(n>=ROUTE.length){setPlaying(false);clearInterval(timerRef.current);return prev;} if(markerRef.current&&window.google?.maps)markerRef.current.setPosition(ROUTE[n]); return n; }); },800); return()=>clearInterval(timerRef.current); },[playing]);

  const cur=ROUTE[idx];
  return (
    <div style={{ padding:24, display:"grid", gridTemplateColumns:"300px 1fr", gap:16, height:"calc(100vh - 100px)" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Card style={{ padding:16 }}>
          <div style={{ color:C.navy, fontWeight:700, marginBottom:14 }}>Route Settings</div>
          <FormSelect label="Vehicle" value={selV} onChange={setSelV} options={[{value:"",label:"Select vehicle…"},...vehicles.map(v=>({value:String(v.id),label:v.name}))]} />
          <FormInput label="Date"  value={date}  onChange={setDate}  type="date" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <FormInput label="From" value={tFrom} onChange={setTFrom} type="time" />
            <FormInput label="To"   value={tTo}   onChange={setTTo}   type="time" />
          </div>
          {!apiKey && <FormInput label="Google Maps API Key" value={keyInput} onChange={setKeyInput} placeholder="AIzaSy…" />}
          <Btn variant="primary" style={{ width:"100%", justifyContent:"center" }} onClick={()=>{ if(!apiKey&&keyInput){setApiKey(keyInput);loadHistMap(keyInput);} setIdx(0); setPlaying(false); }}>
            <Search size={14} /> Show Route
          </Btn>
        </Card>
        <Card style={{ padding:16 }}>
          <div style={{ color:C.navy, fontWeight:700, marginBottom:12 }}>Trip Statistics</div>
          {[["Distance","18.4 km"],["Max Speed","61 km/h"],["Avg Speed","44 km/h"],["Drive Time","35 min"],["Stop Time","10 min"]].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color:C.muted, fontSize:12 }}>{l}</span>
              <span style={{ color:C.navy, fontWeight:600, fontSize:13 }}>{v}</span>
            </div>
          ))}
        </Card>
        <Card style={{ padding:16 }}>
          <div style={{ color:C.navy, fontWeight:700, marginBottom:10 }}>Playback</div>
          <div style={{ color:C.muted, fontSize:12, marginBottom:4 }}>Time: <b style={{ color:C.navy }}>{cur.time}</b> · Speed: <b style={{ color:C.navy }}>{cur.speed} km/h</b></div>
          <div style={{ color:C.faint, fontSize:11, marginBottom:8 }}>Point {idx+1} / {ROUTE.length}</div>
          <div style={{ background:C.border, borderRadius:4, height:4, marginBottom:12 }}>
            <div style={{ background:C.accent, height:"100%", width:`${(idx/(ROUTE.length-1))*100}%`, borderRadius:4, transition:"width .3s" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"center", gap:6 }}>
            <Btn onClick={()=>{ setIdx(0); setPlaying(false); if(markerRef.current&&window.google?.maps)markerRef.current.setPosition(ROUTE[0]); }}><SkipBack size={14} /></Btn>
            <Btn onClick={()=>{ const n=Math.max(0,idx-1); setIdx(n); if(markerRef.current&&window.google?.maps)markerRef.current.setPosition(ROUTE[n]); }}><ChevronLeft size={14} /></Btn>
            <Btn variant={playing?"danger":"primary"} onClick={()=>setPlaying(p=>!p)}>{playing?<Pause size={14}/>:<Play size={14}/>}{playing?"Pause":"Play"}</Btn>
            <Btn onClick={()=>{ const n=Math.min(ROUTE.length-1,idx+1); setIdx(n); if(markerRef.current&&window.google?.maps)markerRef.current.setPosition(ROUTE[n]); }}><ChevronRight size={14} /></Btn>
            <Btn onClick={()=>{ const l=ROUTE.length-1; setIdx(l); setPlaying(false); if(markerRef.current&&window.google?.maps)markerRef.current.setPosition(ROUTE[l]); }}><SkipForward size={14} /></Btn>
          </div>
        </Card>
      </div>
      <Card style={{ overflow:"hidden", position:"relative" }}>
        <div ref={mapEl} style={{ width:"100%", height:"100%" }} />
        {!apiKey && <div style={{ position:"absolute", inset:0, background:"#F0F7FF", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:12 }}><div style={{ textAlign:"center", color:C.muted }}><MapPin size={32} color={C.faint} style={{ margin:"0 auto 8px" }} /><div style={{ fontSize:13 }}>Enter API key and click Show Route</div></div></div>}
      </Card>
    </div>
  );
}

// ── Alerts Page ────────────────────────────────────────────────────────────────
function AlertsPage({ alerts, setAlerts }) {
  const [search,setSearch]=useState(""); const [typeF,setTypeF]=useState("all"); const [statusF,setStatusF]=useState("all");
  const filtered=alerts.filter(a=>{ const q=search.toLowerCase(); const ok=!q||a.vehicle.toLowerCase().includes(q)||(ALERT_LABEL[a.type]||"").toLowerCase().includes(q); return ok&&(typeF==="all"||a.type===typeF)&&(statusF==="all"||a.status===statusF); });
  return (
    <div style={{ padding:24 }}>
      <PageHeader title="Alerts" subtitle={`${alerts.filter(a=>a.status==="unread").length} unread`}>
        <Btn onClick={()=>setAlerts(prev=>prev.map(a=>({...a,status:"read"})))}><CheckCircle size={14} /> Mark All Read</Btn>
      </PageHeader>
      <Card>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:10 }}>
          <Input placeholder="Search vehicle or type…" value={search} onChange={setSearch} icon={<Search size={13} />} style={{ flex:1 }} />
          <Select value={typeF} onChange={setTypeF} options={[{value:"all",label:"All Types"},{value:"overspeed",label:"Overspeed"},{value:"geofence_in",label:"Geofence In"},{value:"geofence_out",label:"Geofence Out"},{value:"gps_offline",label:"GPS Offline"},{value:"ignition_on",label:"Ignition ON"},{value:"low_battery",label:"Low Battery"},{value:"long_stop",label:"Long Stop"}]} />
          <Select value={statusF} onChange={setStatusF} options={[{value:"all",label:"All Status"},{value:"unread",label:"Unread"},{value:"read",label:"Read"}]} />
        </div>
        <Table
          columns={[
            { key:"status",     label:"",         render:(v,r)=><div style={{ width:8,height:8,borderRadius:"50%",background:v==="unread"?C.red:C.border,margin:"0 auto" }} /> },
            { key:"type",       label:"Alert Type",render:v=><AlertBadge type={v} /> },
            { key:"vehicle",    label:"Vehicle",  render:v=><span style={{ fontWeight:600,color:C.navy }}>{v}</span> },
            { key:"datetime",   label:"Date/Time" },
            { key:"location",   label:"Location"  },
            { key:"speed",      label:"Speed",    render:v=>v?`${v} km/h`:"—" },
            { key:"description",label:"Description",render:v=><span style={{ color:C.muted,fontSize:11 }}>{v}</span> },
          ]}
          rows={filtered}
          onAction={row=>row.status==="unread"?[<Btn key="r" variant="ghost" onClick={()=>setAlerts(prev=>prev.map(a=>a.id===row.id?{...a,status:"read"}:a))} style={{ fontSize:11 }}><Check size={12} /> Read</Btn>]:[<span key="d" style={{ color:C.faint,fontSize:11 }}>Read</span>]}
        />
      </Card>
    </div>
  );
}

// ── Drivers Page ───────────────────────────────────────────────────────────────
const D_INIT = { name:"",phone:"",license:"",licenseExpiry:"",vehicleId:"",vehicle:"",status:"active" };

function DriversPage({ drivers, setDrivers, vehicles }) {
  const [search,setSearch]=useState(""); const [modal,setModal]=useState(null); const [form,setForm]=useState(D_INIT);
  const setF=k=>v=>setForm(f=>({...f,[k]:v}));
  const filtered=drivers.filter(d=>!search||d.name.toLowerCase().includes(search.toLowerCase())||d.phone.includes(search)||d.license.toLowerCase().includes(search.toLowerCase()));
  const save=()=>{ const sel=vehicles.find(v=>String(v.id)===String(form.vehicleId)); const u={...form,vehicle:sel?.name||"Unassigned",id:form.id||Date.now()}; if(modal==="add")setDrivers(prev=>[...prev,u]); else setDrivers(prev=>prev.map(d=>d.id===form.id?u:d)); setModal(null); };
  return (
    <div style={{ padding:24 }}>
      <PageHeader title="Drivers" subtitle={`${drivers.length} registered drivers`}>
        <Btn variant="primary" onClick={()=>{ setForm(D_INIT); setModal("add"); }}><Plus size={14} /> Add Driver</Btn>
      </PageHeader>
      <Card>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}><Input placeholder="Search drivers…" value={search} onChange={setSearch} icon={<Search size={13} />} /></div>
        <Table
          columns={[
            { key:"name",          label:"Driver",       render:v=><span style={{ fontWeight:600,color:C.navy }}>👤 {v}</span> },
            { key:"phone",         label:"Phone"         },
            { key:"license",       label:"License No."   },
            { key:"licenseExpiry", label:"Expiry Date"   },
            { key:"vehicle",       label:"Assigned Vehicle" },
            { key:"status",        label:"Status",       render:v=><Badge status={v==="active"?"online":"offline"} label={v} /> },
          ]}
          rows={filtered}
          onAction={row=>[
            <Btn key="e" variant="ghost" onClick={()=>{ setForm(row); setModal("edit"); }}><Edit size={13} /></Btn>,
            <Btn key="d" variant="ghost" onClick={()=>{ if(window.confirm("Delete driver?")) setDrivers(prev=>prev.filter(d=>d.id!==row.id)); }} style={{ color:C.red }}><Trash2 size={13} /></Btn>,
          ]}
        />
      </Card>
      {(modal==="add"||modal==="edit") && (
        <Modal title={modal==="add"?"Add Driver":"Edit Driver"} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            <FormInput label="Driver Name"    value={form.name}          onChange={setF("name")}          placeholder="Dara Sok" />
            <FormInput label="Phone"          value={form.phone}         onChange={setF("phone")}         placeholder="012-345-678" />
            <FormInput label="License Number" value={form.license}       onChange={setF("license")}       placeholder="B-123456" />
            <FormInput label="License Expiry" value={form.licenseExpiry} onChange={setF("licenseExpiry")} type="date" />
            <FormSelect label="Assign Vehicle" value={String(form.vehicleId)} onChange={setF("vehicleId")} options={[{value:"",label:"Unassigned"},...vehicles.map(v=>({value:String(v.id),label:v.name}))]} />
            <FormSelect label="Status"        value={form.status}        onChange={setF("status")}        options={[{value:"active",label:"Active"},{value:"inactive",label:"Inactive"}]} />
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}><Check size={14} /> Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Geofences Page ─────────────────────────────────────────────────────────────
function GeofencesPage({ geofences, setGeofences }) {
  const [modal,setModal]=useState(null); const [form,setForm]=useState({ name:"",type:"circle",radius:500,enabled:true,alertEntry:true,alertExit:true });
  const setF=k=>v=>setForm(f=>({...f,[k]:v}));
  const save=()=>{ if(modal==="add")setGeofences(prev=>[...prev,{...form,id:Date.now(),center:{lat:11.5564,lng:104.9282}}]); else setGeofences(prev=>prev.map(g=>g.id===form.id?{...g,...form}:g)); setModal(null); };
  return (
    <div style={{ padding:24 }}>
      <PageHeader title="Geofences" subtitle="Create virtual boundaries for your fleet">
        <Btn variant="primary" onClick={()=>{ setForm({name:"",type:"circle",radius:500,enabled:true,alertEntry:true,alertExit:true}); setModal("add"); }}><Plus size={14} /> Create Geofence</Btn>
      </PageHeader>
      <Card>
        <Table
          columns={[
            { key:"name",       label:"Name",      render:v=><span style={{ fontWeight:600,color:C.navy }}>⬡ {v}</span> },
            { key:"type",       label:"Type",      render:v=><Badge status="online" label={v} /> },
            { key:"radius",     label:"Radius",    render:(v,r)=>r.type==="circle"?`${v}m`:"Polygon" },
            { key:"alertEntry", label:"On Entry",  render:v=><span style={{ color:v?C.green:C.muted }}>{v?"✓ Alert":"—"}</span> },
            { key:"alertExit",  label:"On Exit",   render:v=><span style={{ color:v?C.green:C.muted }}>{v?"✓ Alert":"—"}</span> },
            { key:"enabled",    label:"Status",    render:(v,row)=><button onClick={()=>setGeofences(prev=>prev.map(g=>g.id===row.id?{...g,enabled:!g.enabled}:g))} style={{ background:v?C.green:"#CBD5E1",border:"none",borderRadius:20,width:40,height:20,cursor:"pointer",position:"relative" }}><div style={{ position:"absolute",top:2,left:v?20:2,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s" }} /></button> },
          ]}
          rows={geofences}
          onAction={row=>[
            <Btn key="e" variant="ghost" onClick={()=>{ setForm(row); setModal("edit"); }}><Edit size={13} /></Btn>,
            <Btn key="d" variant="ghost" onClick={()=>{ if(window.confirm("Delete?")) setGeofences(prev=>prev.filter(g=>g.id!==row.id)); }} style={{ color:C.red }}><Trash2 size={13} /></Btn>,
          ]}
        />
      </Card>
      <Card style={{ marginTop:16, padding:20 }}>
        <div style={{ color:C.navy, fontWeight:700, marginBottom:10 }}>Geofences on Map</div>
        <div style={{ height:260, background:"#EFF6FF", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", border:`2px dashed ${C.accentB}` }}>
          <div style={{ textAlign:"center", color:C.muted }}><Hexagon size={36} color={C.accentB} style={{ margin:"0 auto 8px" }} /><div style={{ fontSize:13 }}>Enter Google Maps API key in Live Tracking to enable map view</div></div>
        </div>
      </Card>
      {(modal==="add"||modal==="edit") && (
        <Modal title={modal==="add"?"Create Geofence":"Edit Geofence"} onClose={()=>setModal(null)}>
          <FormInput label="Geofence Name" value={form.name} onChange={setF("name")} placeholder="Office Zone" />
          <FormSelect label="Shape" value={form.type} onChange={setF("type")} options={[{value:"circle",label:"Circle"},{value:"polygon",label:"Polygon"}]} />
          {form.type==="circle" && <FormInput label="Radius (metres)" value={String(form.radius)} onChange={v=>setF("radius")(Number(v))} placeholder="500" type="number" />}
          <div style={{ display:"flex", gap:16, marginBottom:14 }}>
            {[["alertEntry","Alert on Entry"],["alertExit","Alert on Exit"],["enabled","Enabled"]].map(([k,l])=>(
              <label key={k} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:C.mid, cursor:"pointer" }}>
                <input type="checkbox" checked={!!form[k]} onChange={e=>setF(k)(e.target.checked)} /> {l}
              </label>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}><Check size={14} /> Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Reports Page ───────────────────────────────────────────────────────────────
function ReportsPage({ vehicles, drivers }) {
  const [rtype,setRtype]=useState("distance"); const [vehF,setVehF]=useState("all"); const [drvF,setDrvF]=useState("all");
  const mockReport=[
    { id:1, vehicle:"Toyota Camry 001",  driver:"Dara Sok",    date:"2026-09-08", distance:"142 km", trips:8,  maxSpeed:"82 km/h", driveTime:"3h 12m", stopTime:"45m", alerts:2 },
    { id:2, vehicle:"Honda Wave 001",    driver:"Sopha Chan",  date:"2026-09-08", distance:"68 km",  trips:5,  maxSpeed:"61 km/h", driveTime:"1h 48m", stopTime:"30m", alerts:0 },
    { id:3, vehicle:"Lexus RX 001",      driver:"Kanha Pich",  date:"2026-09-08", distance:"198 km", trips:12, maxSpeed:"95 km/h", driveTime:"4h 05m", stopTime:"55m", alerts:3 },
    { id:4, vehicle:"Honda CR-V 001",    driver:"Rathana Kim", date:"2026-09-08", distance:"88 km",  trips:6,  maxSpeed:"74 km/h", driveTime:"2h 20m", stopTime:"40m", alerts:1 },
    { id:5, vehicle:"Honda PCX 001",     driver:"Kanha Pich",  date:"2026-09-08", distance:"55 km",  trips:4,  maxSpeed:"58 km/h", driveTime:"1h 30m", stopTime:"25m", alerts:0 },
  ];
  return (
    <div style={{ padding:24 }}>
      <PageHeader title="Reports" subtitle="Generate and export fleet reports">
        <Btn><Download size={14} /> PDF</Btn>
        <Btn><Download size={14} /> Excel</Btn>
        <Btn><Download size={14} /> CSV</Btn>
      </PageHeader>
      <Card style={{ padding:16, marginBottom:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          <Select value={rtype} onChange={setRtype} options={[{value:"distance",label:"Distance Report"},{value:"trips",label:"Trips Report"},{value:"speed",label:"Speed Report"},{value:"stop",label:"Stop Report"},{value:"alerts",label:"Alerts Report"},{value:"activity",label:"Activity Report"}]} />
          <Select value={vehF} onChange={setVehF} options={[{value:"all",label:"All Vehicles"},...vehicles.map(v=>({value:String(v.id),label:v.name}))]} />
          <Select value={drvF} onChange={setDrvF} options={[{value:"all",label:"All Drivers"},...drivers.map(d=>({value:String(d.id),label:d.name}))]} />
          <Btn variant="primary" style={{ justifyContent:"center" }}><Search size={14} /> Generate</Btn>
        </div>
      </Card>
      <Card>
        <Table
          columns={[
            { key:"vehicle",   label:"Vehicle",   render:v=><span style={{ fontWeight:600,color:C.navy }}>🚗 {v}</span> },
            { key:"driver",    label:"Driver"     },
            { key:"date",      label:"Date"       },
            { key:"distance",  label:"Distance"   },
            { key:"trips",     label:"Trips"      },
            { key:"maxSpeed",  label:"Max Speed"  },
            { key:"driveTime", label:"Drive Time" },
            { key:"stopTime",  label:"Stop Time"  },
            { key:"alerts",    label:"Alerts",    render:v=><span style={{ color:v>0?C.red:C.green,fontWeight:600 }}>{v}</span> },
          ]}
          rows={mockReport}
        />
      </Card>
    </div>
  );
}

// ── GPS Devices Page ───────────────────────────────────────────────────────────
const DEV_INIT = { imei:"",model:"",sim:"",vehicleId:"",vehicle:"",protocol:"GT06",gpsStatus:"online" };

function GPSDevicesPage({ devices, setDevices, vehicles }) {
  const [search,setSearch]=useState(""); const [modal,setModal]=useState(null); const [form,setForm]=useState(DEV_INIT);
  const setF=k=>v=>setForm(f=>({...f,[k]:v}));
  const filtered=devices.filter(d=>!search||d.imei.includes(search)||d.model.toLowerCase().includes(search.toLowerCase())||d.vehicle?.toLowerCase().includes(search.toLowerCase()));
  const save=()=>{ const sel=vehicles.find(v=>String(v.id)===String(form.vehicleId)); const d={...form,vehicle:sel?.name||"Unassigned",id:form.id||Date.now(),lastConnection:"Now",lastUpdate:"Now"}; if(modal==="add")setDevices(prev=>[...prev,d]); else setDevices(prev=>prev.map(x=>x.id===form.id?d:x)); setModal(null); };
  return (
    <div style={{ padding:24 }}>
      <PageHeader title="GPS Devices" subtitle={`${devices.length} devices registered`}>
        <Btn variant="primary" onClick={()=>{ setForm(DEV_INIT); setModal("add"); }}><Plus size={14} /> Add Device</Btn>
      </PageHeader>
      <Card>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}><Input placeholder="Search IMEI, model, vehicle…" value={search} onChange={setSearch} icon={<Search size={13} />} /></div>
        <Table
          columns={[
            { key:"imei",           label:"IMEI",            render:v=><code style={{ fontSize:11,color:C.muted }}>{v}</code> },
            { key:"model",          label:"Device Model",    render:v=><span style={{ fontWeight:600,color:C.navy }}>{v}</span> },
            { key:"sim",            label:"SIM Number"       },
            { key:"vehicle",        label:"Assigned Vehicle" },
            { key:"protocol",       label:"Protocol"         },
            { key:"gpsStatus",      label:"GPS Status",      render:v=><Badge status={v==="online"?"online":"offline"} label={v} /> },
            { key:"lastConnection", label:"Last Connection"  },
            { key:"lastUpdate",     label:"Last Update"      },
          ]}
          rows={filtered}
          onAction={row=>[
            <Btn key="e" variant="ghost" onClick={()=>{ setForm(row); setModal("edit"); }}><Edit size={13} /></Btn>,
            <Btn key="d" variant="ghost" onClick={()=>{ if(window.confirm("Delete device?")) setDevices(prev=>prev.filter(d=>d.id!==row.id)); }} style={{ color:C.red }}><Trash2 size={13} /></Btn>,
          ]}
        />
      </Card>
      {(modal==="add"||modal==="edit") && (
        <Modal title={modal==="add"?"Add GPS Device":"Edit Device"} onClose={()=>setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            <FormInput label="IMEI (15 digits)" value={form.imei}     onChange={setF("imei")}     placeholder="356938035643809" />
            <FormInput label="Device Model"     value={form.model}    onChange={setF("model")}    placeholder="Teltonika FMB920" />
            <FormInput label="SIM Number"       value={form.sim}      onChange={setF("sim")}      placeholder="012-111-2222" />
            <FormSelect label="Protocol"        value={form.protocol} onChange={setF("protocol")} options={[{value:"GT06",label:"GT06"},{value:"TK103",label:"TK103"},{value:"Teltonika",label:"Teltonika"},{value:"MQTT",label:"MQTT"}]} />
            <FormSelect label="Assign Vehicle"  value={String(form.vehicleId)} onChange={setF("vehicleId")} options={[{value:"",label:"Unassigned"},...vehicles.map(v=>({value:String(v.id),label:v.name}))]} />
            <FormSelect label="GPS Status"      value={form.gpsStatus} onChange={setF("gpsStatus")} options={[{value:"online",label:"Online"},{value:"offline",label:"Offline"}]} />
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}><Check size={14} /> Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Users Page ─────────────────────────────────────────────────────────────────
const ALL_PERMS = ["live","vehicles","history","alerts","drivers","geofences","reports","devices","users","settings"];
const U_INIT    = { name:"",email:"",role:"staff",status:"active",permissions:[] };

function UsersPage({ users, setUsers }) {
  const [modal,setModal]=useState(null); const [form,setForm]=useState(U_INIT);
  const setF=k=>v=>setForm(f=>({...f,[k]:v}));
  const toggleP=p=>setForm(f=>({...f,permissions:f.permissions.includes(p)?f.permissions.filter(x=>x!==p):[...f.permissions,p]}));
  const save=()=>{ const u={...form,id:form.id||Date.now(),lastLogin:"Just now"}; if(modal==="add")setUsers(prev=>[...prev,u]); else setUsers(prev=>prev.map(x=>x.id===form.id?u:x)); setModal(null); };
  return (
    <div style={{ padding:24 }}>
      <PageHeader title="Users" subtitle="Manage system access and permissions">
        <Btn variant="primary" onClick={()=>{ setForm(U_INIT); setModal("add"); }}><Plus size={14} /> Add User</Btn>
      </PageHeader>
      <Card>
        <Table
          columns={[
            { key:"name",       label:"Name",   render:v=><span style={{ fontWeight:600,color:C.navy }}>👤 {v}</span> },
            { key:"email",      label:"Email"   },
            { key:"role",       label:"Role",   render:v=><Badge status={v==="admin"?"moving":"online"} label={v.charAt(0).toUpperCase()+v.slice(1)} /> },
            { key:"status",     label:"Status", render:v=><Badge status={v==="active"?"online":"offline"} label={v} /> },
            { key:"permissions",label:"Access", render:(v,r)=>r.role==="admin"?<span style={{ color:C.green,fontSize:11,fontWeight:600 }}>Full Access</span>:<span style={{ fontSize:11,color:C.muted }}>{Array.isArray(v)?v.length:0} pages</span> },
            { key:"lastLogin",  label:"Last Login" },
          ]}
          rows={users}
          onAction={row=>[
            <Btn key="e" variant="ghost" onClick={()=>{ setForm({...row,permissions:row.permissions||[]}); setModal("edit"); }}><Edit size={13} /></Btn>,
            <Btn key="d" variant="ghost" onClick={()=>{ if(window.confirm("Delete user?")) setUsers(prev=>prev.filter(u=>u.id!==row.id)); }} style={{ color:C.red }}><Trash2 size={13} /></Btn>,
          ]}
        />
      </Card>
      {(modal==="add"||modal==="edit") && (
        <Modal title={modal==="add"?"Add User":"Edit User"} onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            <FormInput label="Full Name" value={form.name}  onChange={setF("name")}  placeholder="Admin KVH" />
            <FormInput label="Email"     value={form.email} onChange={setF("email")} placeholder="admin@kvh.com" type="email" />
            <FormSelect label="Role"     value={form.role}  onChange={setF("role")}  options={[{value:"admin",label:"Admin"},{value:"staff",label:"Staff"}]} />
            <FormSelect label="Status"   value={form.status} onChange={setF("status")} options={[{value:"active",label:"Active"},{value:"inactive",label:"Inactive"}]} />
          </div>
          {form.role==="staff" && (
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", color:C.mid, fontSize:12, fontWeight:600, marginBottom:8 }}>Page Permissions</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {ALL_PERMS.map(p=>(
                  <label key={p} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:C.mid, cursor:"pointer", padding:"5px 10px", background:form.permissions?.includes(p)?C.accentL:C.bg, borderRadius:6, border:`1px solid ${form.permissions?.includes(p)?C.accentB:C.border}` }}>
                    <input type="checkbox" checked={!!form.permissions?.includes(p)} onChange={()=>toggleP(p)} /> {p.charAt(0).toUpperCase()+p.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <Btn onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={save}><Check size={14} /> Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Settings Page ──────────────────────────────────────────────────────────────
function SettingsPage() {
  const [s,setS]=useState({ speedLimit:80,gpsTimeout:15,stopTimeout:120,batteryThreshold:30,updateInterval:10, distanceUnit:"km",speedUnit:"km/h",timezone:"Asia/Phnom_Penh", notifyOverspeed:true,notifyGeofence:true,notifyOffline:true,notifyIgnition:false,notifyBattery:true });
  const setV=k=>v=>setS(p=>({...p,[k]:v}));
  const [saved,setSaved]=useState(false);
  const Section=({title,children})=><Card style={{ padding:20,marginBottom:16 }}><div style={{ color:C.navy,fontWeight:700,fontSize:15,marginBottom:16,paddingBottom:10,borderBottom:`1px solid ${C.border}` }}>{title}</div>{children}</Card>;
  const Row=({label,desc,children})=><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}` }}><div><div style={{ color:C.mid,fontSize:13,fontWeight:500 }}>{label}</div>{desc&&<div style={{ color:C.faint,fontSize:11,marginTop:2 }}>{desc}</div>}</div>{children}</div>;
  const NumInput=({k,unit})=><div style={{ display:"flex",alignItems:"center",gap:8 }}><input type="number" value={s[k]} onChange={e=>setV(k)(Number(e.target.value))} style={{ width:70,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,textAlign:"center",outline:"none" }} /><span style={{ color:C.muted,fontSize:12 }}>{unit}</span></div>;
  const Toggle=({k})=><button onClick={()=>setV(k)(!s[k])} style={{ background:s[k]?C.green:"#CBD5E1",border:"none",borderRadius:20,width:44,height:24,cursor:"pointer",position:"relative",flexShrink:0 }}><div style={{ position:"absolute",top:3,left:s[k]?22:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left .2s" }} /></button>;
  return (
    <div style={{ padding:24, maxWidth:760 }}>
      <PageHeader title="Settings" subtitle="System configuration">
        <Btn variant="primary" onClick={()=>{ setSaved(true); setTimeout(()=>setSaved(false),2000); }}>{saved?<><CheckCircle size={14} /> Saved!</>:<><Check size={14} /> Save Settings</>}</Btn>
      </PageHeader>
      <Section title="Speed & Alerts">
        <Row label="Speed Limit"         desc="Alert when vehicle exceeds this speed"><NumInput k="speedLimit"         unit="km/h"   /></Row>
        <Row label="GPS Offline Timeout" desc="Alert when no GPS signal for this long"><NumInput k="gpsTimeout"        unit="minutes" /></Row>
        <Row label="Long Stop Timeout"   desc="Alert when stopped longer than this"><NumInput    k="stopTimeout"       unit="minutes" /></Row>
        <Row label="Low Battery Alert"   desc="Alert when battery drops below"><NumInput         k="batteryThreshold" unit="%"      /></Row>
        <Row label="GPS Update Interval" desc="How often device sends location"><NumInput         k="updateInterval"   unit="seconds" /></Row>
      </Section>
      <Section title="Notifications">
        <Row label="Overspeed Alert"  desc="Notify when vehicle exceeds speed limit"><Toggle k="notifyOverspeed" /></Row>
        <Row label="Geofence Alert"   desc="Notify on geofence entry/exit"><Toggle          k="notifyGeofence"  /></Row>
        <Row label="GPS Offline"      desc="Notify when GPS signal is lost"><Toggle          k="notifyOffline"   /></Row>
        <Row label="Ignition Alert"   desc="Notify when ignition turns on/off"><Toggle      k="notifyIgnition"  /></Row>
        <Row label="Battery Alert"    desc="Notify when battery is low"><Toggle              k="notifyBattery"   /></Row>
      </Section>
      <Section title="Units & Display">
        <Row label="Distance Unit"><Select value={s.distanceUnit} onChange={setV("distanceUnit")} options={[{value:"km",label:"Kilometers (km)"},{value:"mi",label:"Miles (mi)"}]} /></Row>
        <Row label="Speed Unit"><Select    value={s.speedUnit}    onChange={setV("speedUnit")}    options={[{value:"km/h",label:"km/h"},{value:"mph",label:"mph"}]} /></Row>
        <Row label="Timezone"><Select      value={s.timezone}     onChange={setV("timezone")}     style={{ minWidth:220 }} options={[{value:"Asia/Phnom_Penh",label:"Asia/Phnom_Penh (UTC+7)"},{value:"Asia/Bangkok",label:"Asia/Bangkok (UTC+7)"},{value:"UTC",label:"UTC (UTC+0)"}]} /></Row>
      </Section>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,      setPage]      = useState("dashboard");
  const [vehicles,  setVehicles]  = useState(INIT_VEHICLES);
  const [drivers,   setDrivers]   = useState(INIT_DRIVERS);
  const [alerts,    setAlerts]    = useState(INIT_ALERTS);
  const [devices,   setDevices]   = useState(INIT_DEVICES);
  const [users,     setUsers]     = useState(INIT_USERS);
  const [geofences, setGeofences] = useState(INIT_GEOFENCES);

  useEffect(()=>{
    const id=setInterval(()=>{
      setVehicles(prev=>prev.map(v=>{ if(v.status!=="moving") return v; return { ...v, lat:v.lat+(Math.random()-.5)*.0006, lng:v.lng+(Math.random()-.5)*.0006, speed:Math.max(10,Math.min(100,v.speed+(Math.random()-.5)*8)), lastUpdate:new Date().toLocaleTimeString("en-US",{hour12:false}) }; }));
    },3000);
    return ()=>clearInterval(id);
  },[]);

  const unread = alerts.filter(a=>a.status==="unread").length;
  const TITLES = { dashboard:"Dashboard",live:"Live Tracking",vehicles:"Vehicles",history:"History / Playback",alerts:"Alerts",drivers:"Drivers",geofences:"Geofences",reports:"Reports",devices:"GPS Devices",users:"Users",settings:"Settings" };

  const renderPage=()=>{
    switch(page){
      case "dashboard":  return <Dashboard   vehicles={vehicles} alerts={alerts} />;
      case "live":       return <LiveTracking vehicles={vehicles} />;
      case "vehicles":   return <VehiclesPage  vehicles={vehicles} setVehicles={setVehicles} drivers={drivers} />;
      case "history":    return <HistoryPage   vehicles={vehicles} />;
      case "alerts":     return <AlertsPage    alerts={alerts} setAlerts={setAlerts} />;
      case "drivers":    return <DriversPage   drivers={drivers} setDrivers={setDrivers} vehicles={vehicles} />;
      case "geofences":  return <GeofencesPage geofences={geofences} setGeofences={setGeofences} />;
      case "reports":    return <ReportsPage   vehicles={vehicles} drivers={drivers} />;
      case "devices":    return <GPSDevicesPage devices={devices} setDevices={setDevices} vehicles={vehicles} />;
      case "users":      return <UsersPage     users={users} setUsers={setUsers} />;
      case "settings":   return <SettingsPage />;
      default:           return <Dashboard vehicles={vehicles} alerts={alerts} />;
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", fontFamily:"'Inter',system-ui,sans-serif", fontSize:14 }}>
      <Sidebar current={page} onNav={setPage} unread={unread} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Header title={TITLES[page]} unread={unread} onAlerts={()=>setPage("alerts")} />
        <div style={{ flex:1, overflow:"auto", background:C.bg }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}