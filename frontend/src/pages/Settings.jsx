import { useState, useRef } from "react";
import { Check, CheckCircle, Gauge, Bell, Globe2, Minus, Plus, RotateCcw } from "lucide-react";
import { C } from "../constants/colors.js";
import Card from "../components/ui/Card.jsx";
import Btn from "../components/ui/Btn.jsx";
import Select from "../components/ui/Select.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

const STORAGE_KEY = "kvh_settings";

const DEFAULTS = {
  speedLimit: 80, gpsTimeout: 15, stopTimeout: 120,
  batteryThreshold: 30, updateInterval: 10,
  distanceUnit: "km", speedUnit: "km/h", timezone: "Asia/Phnom_Penh",
  notifyOverspeed: true, notifyGeofence: true, notifyOffline: true,
  notifyIgnition: false, notifyBattery: true,
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULTS, ...saved };
  } catch {
    return DEFAULTS;
  }
}

/* Section header: colored icon badge + title + optional description, matching the
   icon-chip language used on Drivers/Vehicles elsewhere in the app. */
const SectionHeader = ({ icon: Icon, tint, title, desc }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: tint.bg, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon size={17} color={tint.fg} />
    </div>
    <div>
      <div style={{ color: C.navy, fontWeight: 700, fontSize: 14.5 }}>{title}</div>
      {desc && <div style={{ color: C.faint, fontSize: 12, marginTop: 1 }}>{desc}</div>}
    </div>
  </div>
);

const Row = ({ label, desc, children, last }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "13px 2px", borderBottom: last ? "none" : `1px solid ${C.border}`,
    gap: 16,
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ color: C.mid, fontSize: 13, fontWeight: 500 }}>{label}</div>
      {desc && <div style={{ color: C.faint, fontSize: 11.5, marginTop: 2 }}>{desc}</div>}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

/* Numeric input with +/- steppers instead of a bare browser number field */
const NumInput = ({ value, onChange, unit, step = 1, min = 0 }) => {
  const nudge = d => onChange(Math.max(min, Number(value) + d));
  const btnStyle = {
    width: 26, height: 26, border: `1px solid ${C.border}`, background: C.bg,
    color: C.mid, borderRadius: 6, cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button type="button" style={btnStyle} onClick={() => nudge(-step)}><Minus size={12} /></button>
      <input
        type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: 54, padding: "6px 4px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontWeight: 600, color: C.navy, textAlign: "center", outline: "none" }}
      />
      <button type="button" style={btnStyle} onClick={() => nudge(step)}><Plus size={12} /></button>
      <span style={{ color: C.faint, fontSize: 11.5, width: 48 }}>{unit}</span>
    </div>
  );
};

const Toggle = ({ on, onChange }) => (
  <button type="button" onClick={() => onChange(!on)}
    style={{ background: on ? C.accent : "#CBD5E1", border: "none", borderRadius: 20, width: 42, height: 23, cursor: "pointer", position: "relative", flexShrink: 0, transition: "background .15s ease" }}>
    <div style={{ position: "absolute", top: 2.5, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .18s ease" }} />
  </button>
);

export default function Settings() {
  const [s, setS] = useState(loadSettings);
  const initial = useRef(s);
  const setV = k => v => setS(p => ({ ...p, [k]: v }));
  const [saved, setSaved] = useState(false);

  const dirty = JSON.stringify(s) !== JSON.stringify(initial.current);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    initial.current = s;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const handleDiscard = () => setS(initial.current);

  return (
    <div style={{ padding: 24, paddingBottom: dirty ? 88 : 24, maxWidth: 780 }}>
      <PageHeader title="Settings" subtitle="System configuration for KVH GPS Tracker">
        <Btn variant="primary" onClick={handleSave} disabled={!dirty && !saved}>
          {saved ? <><CheckCircle size={14} /> Saved!</> : <><Check size={14} /> Save Settings</>}
        </Btn>
      </PageHeader>

      <Card style={{ padding: 22, marginBottom: 16 }}>
        <SectionHeader icon={Gauge} tint={{ bg: C.accentL, fg: C.accent }}
          title="Speed & Thresholds" desc="When the system should raise an alert" />
        <Row label="Speed Limit"         desc="Alert when vehicle exceeds this speed">
          <NumInput value={s.speedLimit}       onChange={setV("speedLimit")}       unit="km/h"    step={5} />
        </Row>
        <Row label="GPS Offline Timeout" desc="Alert when no GPS signal received">
          <NumInput value={s.gpsTimeout}       onChange={setV("gpsTimeout")}       unit="minutes" />
        </Row>
        <Row label="Long Stop Timeout"   desc="Alert when vehicle stopped too long">
          <NumInput value={s.stopTimeout}      onChange={setV("stopTimeout")}      unit="minutes" step={10} />
        </Row>
        <Row label="Low Battery Alert"   desc="Alert when battery drops below">
          <NumInput value={s.batteryThreshold} onChange={setV("batteryThreshold")} unit="%"       min={0} />
        </Row>
        <Row label="GPS Update Interval" desc="How often device sends location" last>
          <NumInput value={s.updateInterval}   onChange={setV("updateInterval")}   unit="seconds" />
        </Row>
      </Card>

      <Card style={{ padding: 22, marginBottom: 16 }}>
        <SectionHeader icon={Bell} tint={{ bg: C.amberL, fg: C.amber }}
          title="Notifications" desc="Which events generate an alert" />
        <Row label="Overspeed Alert" desc="Notify when vehicle exceeds speed limit">
          <Toggle on={s.notifyOverspeed} onChange={setV("notifyOverspeed")} />
        </Row>
        <Row label="Geofence Alert"  desc="Notify on geofence entry or exit">
          <Toggle on={s.notifyGeofence}  onChange={setV("notifyGeofence")} />
        </Row>
        <Row label="GPS Offline"     desc="Notify when GPS signal is lost">
          <Toggle on={s.notifyOffline}   onChange={setV("notifyOffline")} />
        </Row>
        <Row label="Ignition Alert"  desc="Notify when ignition turns on or off">
          <Toggle on={s.notifyIgnition}  onChange={setV("notifyIgnition")} />
        </Row>
        <Row label="Battery Alert"   desc="Notify when battery is low" last>
          <Toggle on={s.notifyBattery}   onChange={setV("notifyBattery")} />
        </Row>
      </Card>

      <Card style={{ padding: 22 }}>
        <SectionHeader icon={Globe2} tint={{ bg: C.greenL, fg: C.green }}
          title="Units & Timezone" desc="How measurements are displayed" />
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 160px" }}>
            <div style={{ color: C.faint, fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: .3 }}>DISTANCE UNIT</div>
            <Select value={s.distanceUnit} onChange={setV("distanceUnit")}
              options={[{ value: "km", label: "Kilometers (km)" }, { value: "mi", label: "Miles (mi)" }]} />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <div style={{ color: C.faint, fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: .3 }}>SPEED UNIT</div>
            <Select value={s.speedUnit} onChange={setV("speedUnit")}
              options={[{ value: "km/h", label: "km/h" }, { value: "mph", label: "mph" }]} />
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <div style={{ color: C.faint, fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: .3 }}>TIMEZONE</div>
            <Select value={s.timezone} onChange={setV("timezone")}
              options={[
                { value: "Asia/Phnom_Penh", label: "Asia/Phnom_Penh (UTC+7)" },
                { value: "Asia/Bangkok",    label: "Asia/Bangkok (UTC+7)" },
                { value: "UTC",             label: "UTC (UTC+0)" },
              ]} />
          </div>
        </div>
      </Card>

      {/* ── Sticky unsaved-changes bar ───────────────────────── */}
      {dirty && (
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
          display: "flex", justifyContent: "center",
          animation: "kvh-settings-bar-up .18s ease-out",
        }}>
          <div style={{
            width: "100%", maxWidth: 780, margin: "0 24px 20px",
            background: C.navy, borderRadius: 12, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            boxShadow: "0 12px 32px rgba(15,23,42,.28)",
          }}>
            <span style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 500 }}>You have unsaved changes</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={handleDiscard}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid rgba(255,255,255,.18)", color: "#CBD5E1", borderRadius: 8, padding: "7px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                <RotateCcw size={13} /> Discard
              </button>
              <button type="button" onClick={handleSave}
                style={{ display: "flex", alignItems: "center", gap: 6, background: C.accent, border: "none", color: "white", borderRadius: 8, padding: "7px 15px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                <Check size={13} /> Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes kvh-settings-bar-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
