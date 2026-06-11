import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axiosSetup';

const STORAGE_KEY = 'compliSec_diagnostic_progress';

const calcScore = (prob, impact) => Math.round((prob / 100) * (impact / 100) * 100);

const riskMeta = (score) => {
  if (score >= 70) return { color: 'var(--danger)',  label: 'Crítico' };
  if (score >= 45) return { color: 'var(--warning)', label: 'Alto'    };
  if (score >= 20) return { color: 'var(--accent)',  label: 'Medio'   };
  return               { color: 'var(--success)', label: 'Bajo'    };
};

const STEPS = ['Empresa','Personas A.6','Físico A.7','Incidentes A.16','Perfil de riesgo','Activos','Revisión'];
const TRI_MAP = { no: 88, sin: 52, ok: 14 };

// ─── Catálogo de activos predefinidos ─────────────────────────────────────────
// Cada activo tiene valores C-I-A preconfigurados + amenazas automáticas
const ASSET_CATALOG = {
  // ── Datos ──
  'Base de datos de clientes': {
    category: '💾 Datos', icon: '🗄️',
    c: 5, i: 5, a: 4,
    description: 'Registros personales, historiales y datos de contacto de clientes.',
    threats: [
      { threat: 'Acceso no autorizado a datos personales', vulnerability: 'Sin cifrado en reposo o control de acceso débil', likelihood: 4, impact: 5 },
      { threat: 'Exfiltración de datos por empleado interno', vulnerability: 'Sin logs de auditoría ni monitoreo de acceso', likelihood: 3, impact: 5 },
    ],
  },
  'Base de datos de empleados / RRHH': {
    category: '💾 Datos', icon: '👥',
    c: 5, i: 4, a: 3,
    description: 'Contratos, remuneraciones, datos personales del equipo.',
    threats: [
      { threat: 'Filtración de datos sensibles de personal', vulnerability: 'Acceso no restringido por rol', likelihood: 3, impact: 4 },
    ],
  },
  'Correos corporativos': {
    category: '💾 Datos', icon: '📧',
    c: 4, i: 3, a: 4,
    description: 'Servicio de correo electrónico empresarial.',
    threats: [
      { threat: 'Phishing o suplantación de identidad', vulnerability: 'Sin MFA activado en cuentas de correo', likelihood: 4, impact: 4 },
      { threat: 'Intercepción de comunicaciones', vulnerability: 'Sin cifrado de correos salientes (TLS)', likelihood: 2, impact: 3 },
    ],
  },
  'Repositorio de código fuente': {
    category: '💾 Datos', icon: '📦',
    c: 4, i: 5, a: 3,
    description: 'Git o similar con el código de los sistemas.',
    threats: [
      { threat: 'Robo de propiedad intelectual', vulnerability: 'Repositorios públicos o sin control de acceso', likelihood: 3, impact: 5 },
      { threat: 'Inyección de código malicioso', vulnerability: 'Sin revisión de código ni protección de rama principal', likelihood: 2, impact: 5 },
    ],
  },
  // ── Sistemas ──
  'Sistema ERP / contabilidad': {
    category: '🖥️ Sistemas', icon: '📊',
    c: 4, i: 5, a: 5,
    description: 'Sistema de gestión empresarial, facturación o contabilidad.',
    threats: [
      { threat: 'Manipulación de registros financieros', vulnerability: 'Sin segregación de funciones en el sistema', likelihood: 3, impact: 5 },
      { threat: 'Ransomware que cifra los datos contables', vulnerability: 'Backups no probados o sin aislamiento', likelihood: 3, impact: 5 },
    ],
  },
  'Aplicación web / sitio corporativo': {
    category: '🖥️ Sistemas', icon: '🌐',
    c: 3, i: 4, a: 5,
    description: 'Sitio web, portal de clientes o aplicación web pública.',
    threats: [
      { threat: 'Defacement o inyección SQL', vulnerability: 'Sin WAF ni escaneo de vulnerabilidades periódico', likelihood: 3, impact: 4 },
      { threat: 'Denegación de servicio (DDoS)', vulnerability: 'Sin protección anti-DDoS ni escalado automático', likelihood: 2, impact: 4 },
    ],
  },
  'Sistema de backups': {
    category: '🖥️ Sistemas', icon: '💿',
    c: 3, i: 4, a: 5,
    description: 'Solución de respaldo de datos críticos.',
    threats: [
      { threat: 'Backups cifrados por ransomware', vulnerability: 'Backups conectados permanentemente a la red', likelihood: 3, impact: 5 },
      { threat: 'Falla de restauración en incidente', vulnerability: 'Backups no probados regularmente', likelihood: 4, impact: 5 },
    ],
  },
  // ── Infraestructura ──
  'Servidor principal / on-premise': {
    category: '🌐 Infraestructura', icon: '🖧',
    c: 4, i: 4, a: 5,
    description: 'Servidor físico o virtual que aloja aplicaciones críticas.',
    threats: [
      { threat: 'Acceso físico no autorizado al servidor', vulnerability: 'Sin control de acceso físico al datacenter', likelihood: 2, impact: 4 },
      { threat: 'Vulnerabilidades del sistema operativo', vulnerability: 'Sin gestión de parches periódica', likelihood: 3, impact: 4 },
    ],
  },
  'Servicios en la nube (AWS / Azure / GCP)': {
    category: '🌐 Infraestructura', icon: '☁️',
    c: 4, i: 4, a: 4,
    description: 'Infraestructura cloud que soporta los sistemas de la organización.',
    threats: [
      { threat: 'Configuración incorrecta de buckets o permisos', vulnerability: 'Sin revisión periódica de configuración cloud', likelihood: 4, impact: 4 },
      { threat: 'Acceso con credenciales comprometidas', vulnerability: 'Sin MFA para cuentas cloud con privilegios', likelihood: 3, impact: 5 },
    ],
  },
  'Red corporativa / VPN': {
    category: '🌐 Infraestructura', icon: '🔌',
    c: 3, i: 3, a: 5,
    description: 'Infraestructura de red local y acceso remoto.',
    threats: [
      { threat: 'Intercepción de tráfico interno', vulnerability: 'Sin segmentación de red ni monitoreo', likelihood: 2, impact: 3 },
      { threat: 'Acceso remoto no autorizado', vulnerability: 'VPN sin MFA o con credenciales débiles', likelihood: 3, impact: 4 },
    ],
  },
  // ── Hardware ──
  'Notebooks / laptops de empleados': {
    category: '💻 Hardware', icon: '💻',
    c: 4, i: 3, a: 3,
    description: 'Computadores portátiles usados por el equipo.',
    threats: [
      { threat: 'Robo o pérdida del dispositivo', vulnerability: 'Sin cifrado de disco (BitLocker / FileVault)', likelihood: 3, impact: 4 },
      { threat: 'Malware instalado por el usuario', vulnerability: 'Sin EDR ni política de instalación de software', likelihood: 3, impact: 3 },
    ],
  },
  'Teléfonos móviles corporativos': {
    category: '💻 Hardware', icon: '📱',
    c: 4, i: 2, a: 3,
    description: 'Smartphones con acceso a correo y sistemas corporativos.',
    threats: [
      { threat: 'Pérdida del dispositivo con acceso a sistemas', vulnerability: 'Sin MDM ni borrado remoto configurado', likelihood: 3, impact: 3 },
    ],
  },
  'Dispositivos de red (router, firewall, switches)': {
    category: '💻 Hardware', icon: '🔧',
    c: 3, i: 4, a: 5,
    description: 'Equipos de red que gestionan el tráfico corporativo.',
    threats: [
      { threat: 'Explotación de vulnerabilidades de firmware', vulnerability: 'Firmware desactualizado sin parches de seguridad', likelihood: 3, impact: 4 },
    ],
  },
  // ── Personas ──
  'Credenciales de administrador de sistemas': {
    category: '🔑 Credenciales', icon: '🔑',
    c: 5, i: 5, a: 3,
    description: 'Cuentas con privilegios elevados sobre sistemas críticos.',
    threats: [
      { threat: 'Compromiso de cuenta privilegiada', vulnerability: 'Sin MFA ni gestión de contraseñas (PAM)', likelihood: 4, impact: 5 },
      { threat: 'Uso indebido por empleado con acceso admin', vulnerability: 'Sin registro de actividad de cuentas privilegiadas', likelihood: 3, impact: 5 },
    ],
  },
  // ── Documentación ──
  'Contratos con clientes / proveedores': {
    category: '📄 Documentación', icon: '📋',
    c: 4, i: 4, a: 2,
    description: 'Acuerdos legales, NDA, contratos de servicio.',
    threats: [
      { threat: 'Filtración de condiciones contractuales', vulnerability: 'Contratos almacenados sin control de acceso', likelihood: 2, impact: 3 },
    ],
  },
};

const CATALOG_CATEGORIES = [...new Set(Object.values(ASSET_CATALOG).map(a => a.category))];


// ─── TriGroup ────────────────────────────────────────────────────────────────
function TriGroup({ groupKey, state, onSelect, options }) {
  const vs = {
    no:  { border:'var(--danger)',  bg:'rgba(239,68,68,.08)',  text:'var(--danger)'  },
    sin: { border:'var(--warning)', bg:'rgba(245,158,11,.08)', text:'var(--warning)' },
    ok:  { border:'var(--success)', bg:'rgba(16,185,129,.08)', text:'var(--success)' },
  };
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.6rem' }}>
      {options.map(([v, title, desc]) => {
        const active = state[groupKey] === v;
        return (
          <div key={v} onClick={() => onSelect(groupKey, v)} style={{
            border: `1.5px solid ${active ? vs[v].border : 'var(--border)'}`,
            borderRadius:10, padding:'0.75rem', cursor:'pointer', textAlign:'center',
            background: active ? vs[v].bg : 'rgba(255,255,255,.03)', transition:'all .15s',
          }}>
            <div style={{ fontSize:'0.85rem', fontWeight:600, marginBottom:3, color: active ? vs[v].text : 'var(--text-primary)' }}>{title}</div>
            <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{desc}</div>
          </div>
        );
      })}
    </div>
  );
}

const DEFAULT_TRI = [['no','No existe','Sin registro'],['sin','Existe','Sin documentar'],['ok','Documentado','Con evidencia']];

// ─── UI helpers ──────────────────────────────────────────────────────────────
const FG = ({ label, iso, children }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
      <span style={{ fontSize:'0.88rem', color:'var(--text-secondary)', fontWeight:500 }}>{label}</span>
      {iso && <span style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--success)', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'1px 8px' }}>{iso}</span>}
    </div>
    {children}
  </div>
);

const Sel = ({ value, onChange, options, placeholder }) => (
  <select value={value} onChange={onChange} style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:8, padding:'0.7rem 1rem', color:'var(--text-primary)', fontSize:'0.9rem', outline:'none', width:'100%', cursor:'pointer' }}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);

const Badge = ({ children }) => (
  <span style={{ display:'inline-flex', alignItems:'center', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'3px 10px', fontSize:'0.75rem', color:'var(--success)', fontWeight:600 }}>{children}</span>
);

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
const DiagnosticWizard = ({ organizationId, userName, onComplete }) => {
  // Carga estado guardado si existe
  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const saved = loadSaved();

  const [step, setStep]     = useState(saved?.step     ?? 0);
  const [tri, setTri]       = useState(saved?.tri      ?? {});
  const [checks, setChecks] = useState(saved?.checks   ?? {});
  const [evSel, setEvSel]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets]           = useState(saved?.assets ?? []);
  const [selectedCatalog, setSelectedCatalog] = useState('');
  const [officer, setOfficer] = useState({ name:'', role:'' });
  const [catFilter, setCatFilter]     = useState('');
  const [error, setError]   = useState('');
  const [showResume, setShowResume] = useState(!!saved && saved.step > 0);

  const [sel, setSels] = useState(saved?.sel ?? { dataSensitivity:'', regulation:'No aplica', providers:'', systems:'', patches:'', rto:'', training:'', providerClauses:'', reviewFreq:'12m' });
  const s = (k,v) => setSels(p => ({...p, [k]:v}));

  const [riskData, setRiskData] = useState(saved?.riskData ?? {
    personas: { label:'Seguridad en personas (A.6)', prob:0, impact:0 },
    fisico:   { label:'Seguridad física (A.7)',       prob:0, impact:0 },
    inc:      { label:'Gestión de incidentes (A.16)', prob:0, impact:0 },
  });

  // Auto-guardar en localStorage cuando cambia el estado
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, tri, checks, sel, riskData, assets }));
    } catch { /* quota exceeded, ignore */ }
  }, [step, tri, checks, sel, riskData]);

  // Limpiar al finalizar
  const clearSaved = () => { try { localStorage.removeItem(STORAGE_KEY); } catch {} };

  const handleTri = (group, v) => {
    setTri(prev => ({...prev, [group]:v}));
    const p = TRI_MAP[v] ?? 0;
    setRiskData(prev => {
      const n = {...prev};
      // Personas (A.6)
      if (group==='nda')           n.personas = {...n.personas, prob:p, impact:75};
      if (group==='induccion')     n.personas = {...n.personas, prob:Math.max(n.personas?.prob||0,p), impact:75};
      if (group==='capacitacion')  n.personas = {...n.personas, prob:p, impact:70};
      if (group==='salida')        n.acceso   = {...n.acceso,   prob:p, impact:80};
      // Físico (A.7)
      if (group==='accesoFisico')  n.fisico   = {...n.fisico,   prob:p, impact:80};
      if (group==='protAmbiental') n.fisico   = {...n.fisico,   prob:Math.max(n.fisico?.prob||0,p), impact:70};
      if (group==='escritorioLimpio') n.fisico = {...n.fisico,  prob:Math.max(n.fisico?.prob||0,p), impact:65};
      // Incidentes
      if (group==='inc')           n.inc      = {...n.inc,      prob:p, impact:70};
      if (group==='canalReporte')  n.inc      = {...n.inc,      prob:Math.max(n.inc?.prob||0,p), impact:65};
      if (group==='registroInc')   n.inc      = {...n.inc,      prob:Math.max(n.inc?.prob||0,p), impact:60};
      return n;
    });
  };

  const handleFinish = async () => {
    // Validar responsable
    if (!officer.name.trim() || !officer.role.trim()) {
      setError('El nombre y cargo del responsable de seguridad son obligatorios.');
      return;
    }
    setSaving(true); setError('');
    const risks = Object.entries(riskData).map(([key,r]) => {
      const score = calcScore(r.prob, r.impact);
      const { label } = riskMeta(score);
      
      const domainLabelsFallback = {
        acceso: 'Control de acceso (A.9)',
        cripto: 'Criptografía (A.10)',
        ops: 'Operaciones (A.12)',
        inc: 'Incidentes (A.16)',
        cont: 'Continuidad (A.17)'
      };
      
      return { 
        domain_key: key, 
        domain_label: r.label || domainLabelsFallback[key] || key, 
        probability: r.prob, 
        impact_value: r.impact, 
        risk_score: score, 
        risk_level_label: label 
      };
    });
    try {
      await axios.post('/api/diagnostic', {
        organization_id: organizationId,
        risks,
        officer: {
          officerName:     officer.name,
          officerRole:     officer.role,
          reviewFrequency: sel.reviewFreq || '12m',
          commitments:     Object.keys(checks).filter(k => checks[k]),
        },
      });
      // Guardar activos + riesgos automáticos del catálogo
      if (assets.length > 0) {
        for (const a of assets) {
          try {
            const assetRes = await axios.post('/api/assets', {
              organization_id: organizationId,
              name: a.name,
              description: a.description || '',
              confidentiality_req: a.confidentiality_req,
              integrity_req: a.integrity_req,
              availability_req: a.availability_req,
            });
            // Crear riesgos automáticos para cada amenaza del activo
            if (assetRes.data?.data?.id && a.threats?.length) {
              for (const t of a.threats) {
                await axios.post('/api/risks', {
                  organization_id: organizationId,
                  asset_id: assetRes.data.data.id,
                  threat: t.threat,
                  vulnerability: t.vulnerability,
                  likelihood: t.likelihood,
                  impact: t.impact,
                  treatment_decision: 'MITIGATE',
                }).catch(() => {});
              }
            }
          } catch { /* no bloquea */ }
        }
      }
      clearSaved();
      onComplete(risks);
    } catch {
      setError('No se pudo guardar el diagnóstico. Puedes intentarlo más tarde desde el dashboard.');
      setSaving(false);
    }
  };

  // Sidebar vertical de pasos
  const Stepbar = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {STEPS.map((label, i) => {
        const done = i < step, active = i === step;
        return (
          <div key={i}
            onClick={() => done && setStep(i)}
            style={{
              display:'flex', alignItems:'center', gap:'0.75rem',
              padding:'0.55rem 0.75rem', borderRadius:8,
              cursor: done ? 'pointer' : 'default',
              background: active ? 'rgba(59,130,246,.12)' : 'transparent',
              border: active ? '1px solid rgba(59,130,246,.25)' : '1px solid transparent',
              transition:'all .2s',
            }}
          >
            <div style={{
              width:28, height:28, borderRadius:'50%', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'0.75rem', fontWeight:700,
              border:`2px solid ${done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--border)'}`,
              color: done ? 'var(--success)' : active ? '#fff' : 'var(--text-secondary)',
              background: active ? 'var(--accent)' : done ? 'rgba(16,185,129,.1)' : 'transparent',
              transition:'all .2s',
            }}>
              {done ? '✓' : i+1}
            </div>
            <span style={{
              fontSize:'0.82rem', fontWeight:600,
              color: active ? 'var(--text-primary)' : done ? 'var(--success)' : 'var(--text-secondary)',
            }}>{label}</span>
          </div>
        );
      })}
    </div>
  );

  // ── Pasos ────────────────────────────────────────────────────────────────
  const steps = [

    // 0 — Empresa
    <div key={0} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <div><h2 style={{ fontSize:'1.5rem', fontWeight:700, margin:'0 0 .4rem', letterSpacing:'-.02em' }}>Contexto de tu organización</h2>
      <p style={{ color:'var(--text-secondary)', margin:0, fontSize:'0.9rem' }}>Este diagnóstico calcula tu perfil de riesgo ISO 27001 basado en el estado actual de tu seguridad.</p></div>
      <FG label="¿Qué tipo de datos manejan?" iso="define impacto base">
        <Sel value={sel.dataSensitivity} onChange={e=>s('dataSensitivity',e.target.value)} placeholder="Seleccionar..." options={[['pub','Datos públicos'],['int','Datos internos'],['conf','Datos confidenciales de clientes'],['crit','Datos críticos (salud, financiero, legal)']]} />
      </FG>
      <FG label="¿Tienen requisitos regulatorios externos?" iso="A.18">
        <Sel value={sel.regulation} onChange={e=>s('regulation',e.target.value)} options={[['No aplica','No aplica'],['RGPD / Ley 19.628','RGPD / Ley 19.628'],['PCI-DSS','PCI-DSS (pagos)'],['HIPAA','HIPAA (salud)'],['SOC 2','SOC 2'],['Otro','Otro']]} />
      </FG>
      <FG label="Tipo de infraestructura principal">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          {[['cloud','☁️ Nube pública','AWS, Azure, GCP'],['hybrid','🔀 Nube híbrida','On-premise + nube'],['own','🖥️ Servidores propios','Data center local'],['saas','📦 Solo SaaS','Apps de terceros']].map(([k,t,d]) => (
            <div key={k} onClick={()=>setTri(p=>({...p,infra:k}))} style={{ border:`1.5px solid ${tri.infra===k?'var(--accent)':'var(--border)'}`, borderRadius:10, padding:'0.85rem 1rem', cursor:'pointer', background: tri.infra===k?'rgba(59,130,246,.08)':'rgba(255,255,255,.03)', transition:'all .15s' }}>
              <div style={{ fontSize:'0.85rem', fontWeight:600, color: tri.infra===k?'var(--accent)':'var(--text-primary)', marginBottom:2 }}>{t}</div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{d}</div>
            </div>
          ))}
        </div>
      </FG>
    </div>,

    // 1 — Personas A.6 / A.7.2
    <div key={1} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <div>
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.6rem', flexWrap:'wrap' }}>
          <span style={{ display:'inline-flex', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'3px 10px', fontSize:'0.75rem', color:'var(--success)', fontWeight:600 }}>A.6 Personas</span>
          <span style={{ display:'inline-flex', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'3px 10px', fontSize:'0.75rem', color:'var(--success)', fontWeight:600 }}>A.7.2 Durante el empleo</span>
        </div>
        <h2 style={{ fontSize:'1.5rem', fontWeight:700, margin:'0 0 .4rem', letterSpacing:'-.02em' }}>Seguridad en personas</h2>
        <p style={{ color:'var(--text-secondary)', margin:0, fontSize:'0.9rem' }}>
          La mayoría de los incidentes de seguridad tienen origen humano. Estas preguntas evalúan tus controles sobre el personal.
        </p>
      </div>
      <FG label="¿Los empleados firman acuerdos de confidencialidad (NDA) al ingresar?" iso="A.6.6">
        <TriGroup groupKey="nda" state={tri} onSelect={handleTri} options={[
          ['no','No existe','Sin NDA firmado'],
          ['sin','Parcial','Algunos roles lo firman'],
          ['ok','Todos firman','Con registro y fecha'],
        ]} />
      </FG>
      <FG label="¿Tienen proceso de inducción en seguridad para empleados nuevos?" iso="A.6.2">
        <TriGroup groupKey="induccion" state={tri} onSelect={handleTri} options={[
          ['no','No existe','Sin inducción definida'],
          ['sin','Informal','Sin documentar ni registrar'],
          ['ok','Documentado','Con registro de asistencia'],
        ]} />
      </FG>
      <FG label="¿Los empleados reciben capacitación periódica en seguridad de la información?" iso="A.6.3">
        <TriGroup groupKey="capacitacion" state={tri} onSelect={handleTri} options={[
          ['no','Nunca','Sin capacitación'],
          ['sin','Esporádica','Sin frecuencia fija'],
          ['ok','Periódica','Al menos 1 vez al año, documentada'],
        ]} />
      </FG>
      <FG label="¿Existe un proceso formal de salida de empleados (revocación de accesos, devolución de equipos)?" iso="A.6.5">
        <TriGroup groupKey="salida" state={tri} onSelect={handleTri} options={[
          ['no','No existe','Se hace ad-hoc'],
          ['sin','Existe','Sin checklist formal'],
          ['ok','Documentado','Checklist con responsable y firma'],
        ]} />
      </FG>
      <FG label="¿Los empleados conocen las consecuencias del incumplimiento de políticas de seguridad?" iso="A.6.4">
        <Sel value={sel.sancionesConocimiento || ''} onChange={e=>s('sancionesConocimiento',e.target.value)} placeholder="Seleccionar..."
          options={[
            ['no','No, no hay política disciplinaria definida'],
            ['parcial','Sí, pero no se comunica formalmente'],
            ['si','Sí, está en el contrato y se comunica en la inducción'],
          ]} />
      </FG>
    </div>,

    // 2 — Físico A.7.1 / A.7.2
    <div key={2} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <div>
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.6rem', flexWrap:'wrap' }}>
          <span style={{ display:'inline-flex', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'3px 10px', fontSize:'0.75rem', color:'var(--success)', fontWeight:600 }}>A.7.1 Perímetros físicos</span>
          <span style={{ display:'inline-flex', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'3px 10px', fontSize:'0.75rem', color:'var(--success)', fontWeight:600 }}>A.7.2 Controles de entrada</span>
        </div>
        <h2 style={{ fontSize:'1.5rem', fontWeight:700, margin:'0 0 .4rem', letterSpacing:'-.02em' }}>Seguridad física y del entorno</h2>
        <p style={{ color:'var(--text-secondary)', margin:0, fontSize:'0.9rem' }}>
          Los controles físicos protegen los activos ante acceso no autorizado, daño o interferencia.
        </p>
      </div>
      <FG label="¿Las áreas con sistemas o datos críticos tienen acceso restringido?" iso="A.7.1">
        <TriGroup groupKey="accesoFisico" state={tri} onSelect={handleTri} options={[
          ['no','Sin restricción','Cualquiera puede acceder'],
          ['sin','Parcial','Solo llave/tarjeta, sin registro'],
          ['ok','Controlado','Con registro de acceso y responsable'],
        ]} />
      </FG>
      <FG label="¿Los servidores o equipos críticos están en áreas con protección ambiental (temperatura, humedad, UPS)?" iso="A.7.5">
        <TriGroup groupKey="protAmbiental" state={tri} onSelect={handleTri} options={[
          ['no','Sin protección','Equipos expuestos'],
          ['sin','Básica','Solo ventilación, sin UPS'],
          ['ok','Adecuada','Aire acondicionado + UPS + monitoreo'],
        ]} />
      </FG>
      <FG label="¿Existe una política de escritorio y pantalla limpia (sin información sensible visible)?" iso="A.7.7">
        <TriGroup groupKey="escritorioLimpio" state={tri} onSelect={handleTri} options={[
          ['no','No existe','Sin política definida'],
          ['sin','Existe','No se cumple ni se audita'],
          ['ok','Implementada','Auditada periódicamente'],
        ]} />
      </FG>
      <FG label="¿Los visitantes son registrados y acompañados en áreas sensibles?" iso="A.7.2">
        <Sel value={sel.visitantes || ''} onChange={e=>s('visitantes',e.target.value)} placeholder="Seleccionar..."
          options={[
            ['no','No, los visitantes acceden libremente'],
            ['parcial','Solo en recepción, sin acompañamiento en áreas internas'],
            ['si','Sí, registro + acompañamiento + identificación visible'],
          ]} />
      </FG>
      <FG label="¿Se realizan revisiones periódicas de las instalaciones de seguridad física?" iso="A.7.9">
        <Sel value={sel.revisionFisica || ''} onChange={e=>s('revisionFisica',e.target.value)} placeholder="Seleccionar..."
          options={[
            ['no','Nunca se ha revisado'],
            ['incidente','Solo tras un incidente'],
            ['anual','Anualmente con registro'],
            ['semestral','Semestralmente con registro'],
          ]} />
      </FG>
    </div>,

    // 3 — Incidentes A.5.24 / A.6.8
    <div key={3} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <div>
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.6rem', flexWrap:'wrap' }}>
          <span style={{ display:'inline-flex', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'3px 10px', fontSize:'0.75rem', color:'var(--success)', fontWeight:600 }}>A.5.24 Incidentes</span>
          <span style={{ display:'inline-flex', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'3px 10px', fontSize:'0.75rem', color:'var(--success)', fontWeight:600 }}>A.6.8 Reporte</span>
        </div>
        <h2 style={{ fontSize:'1.5rem', fontWeight:700, margin:'0 0 .4rem', letterSpacing:'-.02em' }}>Gestión de incidentes</h2>
        <p style={{ color:'var(--text-secondary)', margin:0, fontSize:'0.9rem' }}>
          La norma exige que los empleados sepan cómo reportar y que existan procedimientos documentados.
        </p>
      </div>
      <FG label="¿Existe un procedimiento documentado de respuesta a incidentes de seguridad?" iso="A.5.24">
        <TriGroup groupKey="inc" state={tri} onSelect={handleTri} options={[
          ['no','No existe','Actuamos ad-hoc'],
          ['sin','Existe','Sin documentar'],
          ['ok','Documentado','Con responsable y plazos'],
        ]} />
      </FG>
      <FG label="¿Los empleados saben a quién reportar un incidente o comportamiento sospechoso?" iso="A.6.8">
        <TriGroup groupKey="canalReporte" state={tri} onSelect={handleTri} options={[
          ['no','No existe','No hay canal definido'],
          ['sin','Informal','Se avisa al jefe directo'],
          ['ok','Formal','Canal definido y comunicado a todos'],
        ]} />
      </FG>
      <FG label="¿Se registran y analizan los incidentes de seguridad para aprender de ellos?" iso="A.5.27">
        <TriGroup groupKey="registroInc" state={tri} onSelect={handleTri} options={[
          ['no','No se registran','Sin historial'],
          ['sin','Se registran','Sin análisis posterior'],
          ['ok','Registrados y analizados','Con acciones correctivas'],
        ]} />
      </FG>
      <FG label="¿Cuánto tiempo promedio tardan en detectar un incidente de seguridad interno?" iso="A.5.25">
        <Sel value={sel.tiempoDeteccion || ''} onChange={e=>s('tiempoDeteccion',e.target.value)} placeholder="Seleccionar..."
          options={[
            ['no','No tenemos forma de detectarlo'],
            ['dias','Días o semanas después'],
            ['horas','Horas después'],
            ['inmediato','Casi inmediato (alertas automáticas)'],
          ]} />
      </FG>
    </div>,

    // 4 — Perfil de riesgo (key ya correcto en IIFE)
    // 5 — Perfil de riesgo
    (() => {
      const riskList = Object.entries(riskData).map(([key,r]) => {
        const score = calcScore(r.prob, r.impact);
        return { key, ...r, score, ...riskMeta(score) };
      });
      const critical = riskList.filter(r=>r.score>=70).length;
      const high     = riskList.filter(r=>r.score>=45&&r.score<70).length;
      const low      = riskList.filter(r=>r.score<45).length;
      return (
        <div key={5} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          <div><h2 style={{ fontSize:'1.5rem', fontWeight:700, margin:'0 0 .4rem', letterSpacing:'-.02em' }}>Tu perfil de riesgo inicial</h2>
          <p style={{ color:'var(--text-secondary)', margin:0, fontSize:'0.9rem' }}>Calculado en base a tus respuestas. Aparecerá en el dashboard hasta que evalúes riesgos específicos por activo.</p></div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem' }}>
            {[['Críticos',critical,'var(--danger)'],['Altos',high,'var(--warning)'],['Controlados',low,'var(--success)']].map(([l,n,c]) => (
              <div key={l} className="glass-panel" style={{ textAlign:'center', padding:'1.25rem' }}>
                <div style={{ fontSize:'2.5rem', fontWeight:700, color:c, lineHeight:1 }}>{n}</div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginTop:'0.35rem', textTransform:'uppercase', letterSpacing:'.05em' }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="glass-panel">
            <div style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'1rem' }}>Exposición por dominio</div>
            {riskList.map(r => (
              <div key={r.key} style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.85rem' }}>
                <span style={{ fontSize:'0.82rem', color:'var(--text-secondary)', width:185, flexShrink:0 }}>{r.label}</span>
                <div style={{ flex:1, height:6, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:6, width:`${r.score||2}%`, background:r.color, borderRadius:3, transition:'width .6s ease' }} />
                </div>
                <span style={{ fontSize:'0.78rem', fontWeight:600, color:r.color, width:52, textAlign:'right', flexShrink:0 }}>{r.label}</span>
              </div>
            ))}
          </div>
          <FG label="¿Qué tipo de evidencia tienen disponible hoy?">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              {[['doc','📄 Documento / política','PDF o Word con fecha y firma'],['config','⚙️ Configuración exportada','Captura o export del sistema'],['log','📋 Registro de actividad','Log con timestamps'],['test','🧪 Resultado de prueba','Test o simulacro documentado']].map(([k,t,d]) => (
                <div key={k} onClick={()=>setEvSel(k)} style={{ border:`1.5px solid ${evSel===k?'var(--accent)':'var(--border)'}`, borderRadius:10, padding:'0.85rem 1rem', cursor:'pointer', background: evSel===k?'rgba(59,130,246,.08)':'rgba(255,255,255,.03)', transition:'all .15s' }}>
                  <div style={{ fontSize:'0.85rem', fontWeight:600, color: evSel===k?'var(--accent)':'var(--text-primary)', marginBottom:2 }}>{t}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{d}</div>
                </div>
              ))}
            </div>
          </FG>
          <div style={{ background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, padding:'0.75rem 1rem', fontSize:'0.82rem', color:'var(--warning)' }}>
            ⚠️ Una política escrita NO es evidencia de implementación. Se requieren ambas por separado.
          </div>
        </div>
      );
    })(),

    // 6 — Activos (catálogo inteligente)
    <div key={6} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <div>
        <span style={{ display:'inline-flex', alignItems:'center', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'3px 10px', fontSize:'0.75rem', color:'var(--success)', fontWeight:600, marginBottom:'0.6rem' }}>A.8 Activos de información</span>
        <h2 style={{ fontSize:'1.5rem', fontWeight:700, margin:'0 0 .4rem', letterSpacing:'-.02em' }}>Inventario de activos</h2>
        <p style={{ color:'var(--text-secondary)', margin:0, fontSize:'0.9rem' }}>
          Selecciona los activos que tiene tu organización. Los valores de riesgo C-I-A y las amenazas se calculan automáticamente.
        </p>
      </div>

      {/* Selector de catálogo */}
      <div className="glass-panel" style={{ padding:'1.25rem' }}>
        <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'0.75rem' }}>
          Seleccionar activo del catálogo
        </div>

        {/* Filtro por categoría */}
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem' }}>
          <button onClick={() => setCatFilter('')}
            style={{ padding:'0.3rem 0.8rem', borderRadius:20, fontSize:'0.78rem', fontWeight:600, cursor:'pointer', border:`1px solid ${!catFilter?'var(--accent)':'var(--border)'}`, background:!catFilter?'rgba(59,130,246,.1)':'transparent', color:!catFilter?'var(--accent)':'var(--text-secondary)' }}>
            Todos
          </button>
          {CATALOG_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              style={{ padding:'0.3rem 0.8rem', borderRadius:20, fontSize:'0.78rem', fontWeight:600, cursor:'pointer', border:`1px solid ${catFilter===cat?'var(--accent)':'var(--border)'}`, background:catFilter===cat?'rgba(59,130,246,.1)':'transparent', color:catFilter===cat?'var(--accent)':'var(--text-secondary)' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de activos del catálogo */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'0.6rem', maxHeight:280, overflowY:'auto', paddingRight:4 }}>
          {Object.entries(ASSET_CATALOG)
            .filter(([,a]) => !catFilter || a.category === catFilter)
            .map(([name, a]) => {
              const alreadyAdded = assets.some(x => x.name === name);
              return (
                <div key={name}
                  onClick={() => {
                    if (alreadyAdded) return;
                    setAssets(prev => [...prev, {
                      id: Date.now() + Math.random(),
                      name,
                      description: a.description,
                      confidentiality_req: a.c,
                      integrity_req: a.i,
                      availability_req: a.a,
                      threats: a.threats,
                      fromCatalog: true,
                    }]);
                  }}
                  style={{
                    padding:'0.75rem', borderRadius:10, cursor: alreadyAdded ? 'default' : 'pointer',
                    border:`1px solid ${alreadyAdded?'rgba(16,185,129,.4)':'var(--border)'}`,
                    background: alreadyAdded?'rgba(16,185,129,.06)':'rgba(255,255,255,.03)',
                    transition:'all .15s', opacity: alreadyAdded ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!alreadyAdded) e.currentTarget.style.borderColor='rgba(59,130,246,.4)'; }}
                  onMouseLeave={e => { if (!alreadyAdded) e.currentTarget.style.borderColor='var(--border)'; }}
                >
                  <div style={{ fontSize:'1.4rem', marginBottom:'0.3rem' }}>{a.icon}</div>
                  <div style={{ fontSize:'0.82rem', fontWeight:600, color: alreadyAdded?'var(--success)':'var(--text-primary)', lineHeight:1.3 }}>{name}</div>
                  <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)', marginTop:'0.2rem' }}>{a.category}</div>
                  {alreadyAdded && <div style={{ fontSize:'0.68rem', color:'var(--success)', marginTop:'0.3rem', fontWeight:600 }}>✓ Agregado</div>}
                </div>
              );
            })}
        </div>
      </div>

      {/* Lista de activos seleccionados */}
      {assets.length > 0 ? (
        <div>
          <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'0.75rem' }}>
            {assets.length} activo{assets.length!==1?'s':''} en tu inventario
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {assets.map((a, i) => {
              const cia = a.confidentiality_req + a.integrity_req + a.availability_req;
              const ciaColor = cia>=12?'var(--danger)':cia>=8?'var(--warning)':'var(--success)';
              const ciaLabel = cia>=12?'Alta':cia>=8?'Media':'Baja';
              const catalogData = ASSET_CATALOG[a.name];
              return (
                <div key={a.id} style={{ background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                  {/* Fila principal */}
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.85rem 1rem' }}>
                    <span style={{ fontSize:'1.4rem', flexShrink:0 }}>{catalogData?.icon || '📎'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'0.88rem', fontWeight:700 }}>{a.name}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:1 }}>{a.description}</div>
                    </div>
                    {/* Badges C-I-A */}
                    <div style={{ display:'flex', gap:'0.3rem', flexShrink:0 }}>
                      {[['C',a.confidentiality_req],['I',a.integrity_req],['A',a.availability_req]].map(([l,v])=>(
                        <span key={l} style={{ fontSize:'0.7rem', fontWeight:700, background:'rgba(255,255,255,.06)', borderRadius:6, padding:'2px 5px', color:'var(--text-secondary)' }}>
                          {l}:{v}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize:'0.75rem', fontWeight:700, color:ciaColor, background:`${ciaColor}18`, border:`1px solid ${ciaColor}33`, borderRadius:10, padding:'2px 9px', flexShrink:0 }}>
                      {ciaLabel} ({cia})
                    </span>
                    <button onClick={()=>setAssets(prev=>prev.filter((_,j)=>j!==i))}
                      style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', fontSize:'1rem', padding:'0.2rem', flexShrink:0 }}>✕</button>
                  </div>
                  {/* Amenazas automáticas */}
                  {a.threats && a.threats.length > 0 && (
                    <div style={{ borderTop:'1px solid var(--border)', padding:'0.6rem 1rem', background:'rgba(0,0,0,.15)' }}>
                      <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'0.4rem' }}>
                        Amenazas detectadas automáticamente
                      </div>
                      {a.threats.map((t, ti) => {
                        const riskLevel = t.likelihood * t.impact;
                        const riskC = riskLevel>=15?'var(--danger)':riskLevel>=8?'var(--warning)':'var(--success)';
                        return (
                          <div key={ti} style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom: ti<a.threats.length-1?'0.35rem':0 }}>
                            <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)', flex:1 }}>⚠️ {t.threat}</span>
                            <span style={{ fontSize:'0.68rem', fontWeight:700, color:riskC, background:`${riskC}18`, borderRadius:8, padding:'1px 6px', flexShrink:0 }}>
                              {riskLevel>=15?'Crítico':riskLevel>=8?'Alto':'Bajo'} ({riskLevel})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'2rem', background:'rgba(255,255,255,.02)', border:'1px dashed var(--border)', borderRadius:12 }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>🗃️</div>
          <p style={{ color:'var(--text-secondary)', margin:'0 0 0.3rem', fontSize:'0.88rem', fontWeight:600 }}>Selecciona activos del catálogo</p>
          <p style={{ color:'var(--text-secondary)', margin:0, fontSize:'0.78rem' }}>
            Puedes continuar sin agregarlos y registrarlos después en el módulo Activos.
          </p>
        </div>
      )}
    </div>,

    // 7 — Revisión
    <div key={7} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <div>
        <h2 style={{ fontSize:'1.5rem', fontWeight:700, margin:'0 0 .4rem', letterSpacing:'-.02em' }}>Revisión y compromisos</h2>
        <p style={{ color:'var(--text-secondary)', margin:0, fontSize:'0.9rem' }}>
          Estos compromisos quedan registrados en tu organización y son verificables por un auditor externo.
        </p>
      </div>

      {/* Responsable interno */}
      <div className="glass-panel" style={{ padding:'1.25rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.9rem' }}>
          <span style={{ fontSize:'0.88rem', fontWeight:600 }}>Responsable interno de seguridad</span>
          <span style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--success)', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'1px 8px' }}>
            Cláusula 5.3
          </span>
        </div>
        <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', margin:'0 0 1rem', lineHeight:1.5 }}>
          La norma exige que alguien dentro de la organización sea formalmente responsable del SGSI.
          Esta persona será el punto de contacto en auditorías y revisiones.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          <div>
            <label style={{ fontSize:'0.8rem', color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem', fontWeight:500 }}>
              Nombre completo *
            </label>
            <input
              value={officer.name}
              onChange={e=>setOfficer(p=>({...p,name:e.target.value}))}
              placeholder="Ej: Millaray Miranda"
              style={{ background:'rgba(0,0,0,.25)', border:`1px solid ${!officer.name && error?'var(--danger)':'var(--border)'}`, borderRadius:8, padding:'0.7rem 1rem', color:'var(--text-primary)', fontSize:'0.88rem', outline:'none', width:'100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize:'0.8rem', color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem', fontWeight:500 }}>
              Cargo o rol *
            </label>
            <input
              value={officer.role}
              onChange={e=>setOfficer(p=>({...p,role:e.target.value}))}
              placeholder="Ej: CISO, Gerente TI, Encargado de seguridad"
              style={{ background:'rgba(0,0,0,.25)', border:`1px solid ${!officer.role && error?'var(--danger)':'var(--border)'}`, borderRadius:8, padding:'0.7rem 1rem', color:'var(--text-primary)', fontSize:'0.88rem', outline:'none', width:'100%' }}
            />
          </div>
        </div>
      </div>

      {/* Compromisos con contexto */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
          <span style={{ fontSize:'0.88rem', fontWeight:600 }}>Compromisos auditables</span>
          <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)' }}>
            {Object.values(checks).filter(Boolean).length} de 5 aceptados
          </span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {[
            {
              k:'r1', iso:'A.6', freq:'Antes de cada auditoría',
              txt:'Las evidencias serán revisadas por otra persona antes de presentarlas al auditor.',
              ctx:'La norma prohíbe que quien sube la evidencia sea también quien la valida.'
            },
            {
              k:'r2', iso:'Cláusula 9', freq:'Mínimo 1 vez al año',
              txt:'Los controles del Anexo A serán revisados al menos cada 12 meses.',
              ctx:'La revisión periódica es obligatoria para mantener la certificación ISO 27001.'
            },
            {
              k:'r3', iso:'Cláusula 10', freq:'Al detectar el hallazgo',
              txt:'Los hallazgos de auditoría tendrán un plazo de subsanación definido y registrado.',
              ctx:'Sin plazos formales, los hallazgos quedan abiertos indefinidamente y se convierten en no conformidades.'
            },
            {
              k:'r4', iso:'A.8.15', freq:'Cada vez que se cambie',
              txt:'Los cambios en controles quedarán registrados con fecha, responsable y justificación.',
              ctx:'El historial de cambios es evidencia de gestión activa del SGSI para el auditor.'
            },
            {
              k:'r5', iso:'Anexo A', freq:'Continuo',
              txt:'La Declaración de Aplicabilidad (SoA) se mantendrá actualizada ante cambios organizacionales.',
              ctx:'El SoA es el documento central de la certificación. Un SoA desactualizado invalida la auditoría.'
            },
          ].map(({k,txt,iso,freq,ctx}) => (
            <div key={k} onClick={()=>setChecks(p=>({...p,[k]:!p[k]}))}
              style={{ borderRadius:10, cursor:'pointer', border:`1px solid ${checks[k]?'rgba(16,185,129,.3)':'var(--border)'}`, background: checks[k]?'rgba(16,185,129,.04)':'rgba(255,255,255,.03)', transition:'all .15s', overflow:'hidden' }}>
              {/* Fila principal */}
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.85rem 1rem' }}>
                <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, border:`2px solid ${checks[k]?'var(--success)':'var(--border)'}`, background: checks[k]?'var(--success)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
                  {checks[k] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontSize:'0.88rem', fontWeight: checks[k]?600:400, color: checks[k]?'var(--text-primary)':'var(--text-secondary)', flex:1, lineHeight:1.4 }}>{txt}</span>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.2rem', flexShrink:0 }}>
                  <span style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--success)', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)', borderRadius:10, padding:'1px 7px' }}>{iso}</span>
                  <span style={{ fontSize:'0.65rem', color:'var(--text-secondary)' }}>{freq}</span>
                </div>
              </div>
              {/* Contexto desplegado cuando está marcado */}
              {checks[k] && (
                <div style={{ padding:'0.6rem 1rem 0.75rem 2.85rem', borderTop:'1px solid rgba(16,185,129,.15)', background:'rgba(16,185,129,.03)' }}>
                  <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)', lineHeight:1.5 }}>{ctx}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Frecuencia */}
      <FG label="Frecuencia de revisión interna comprometida">
        <Sel value={sel.reviewFreq||'12m'} onChange={e=>s('reviewFreq',e.target.value)}
          options={[['6m','Cada 6 meses'],['12m','Cada 12 meses (mínimo ISO 27001)'],['3m','Trimestral']]} />
      </FG>

      {error && (
        <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, padding:'0.75rem 1rem', fontSize:'0.85rem', color:'var(--danger)' }}>
          {error}
        </div>
      )}
    </div>,
  ];

  const pct = Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-color)', display:'flex', flexDirection:'column' }}>
      <style>{`select option { background: #2d3748; color: #f8fafc; }`}</style>

      {/* Header — mismo estilo que Layout.jsx */}
      <header className="app-header" style={{ position:'sticky', top:0, zIndex:100 }}>
        <div className="logo-container">
          <img src="/logo.png" alt="CompliSec" width={36} height={36}
            style={{ borderRadius:8, objectFit:'contain' }}
            onError={e => { e.target.style.display='none'; }} />
          <h1>CompliSec</h1>
          <span className="badge">Diagnóstico ISO 27001</span>
        </div>
        <nav className="header-nav" style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
          {userName && (
            <div style={{ display:'flex', flexDirection:'column', lineHeight:1.3, textAlign:'right' }}>
              <span style={{ fontSize:'0.875rem', fontWeight:600 }}>{userName}</span>
              <span style={{ fontSize:'0.7rem', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                Paso {step + 1} de {STEPS.length}
              </span>
            </div>
          )}
          <button onClick={()=>onComplete([])}
            style={{ background:'none', border:'1px solid rgba(239,68,68,0.4)', color:'var(--danger)', cursor:'pointer', fontSize:'0.8rem', padding:'0.3rem 0.75rem', borderRadius:'0.5rem', transition:'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}>
            Completar más tarde
          </button>
        </nav>
      </header>

      {/* Banner de progreso guardado */}
      {showResume && (
        <div style={{ background:'rgba(59,130,246,.1)', borderBottom:'1px solid rgba(59,130,246,.2)', padding:'0.65rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem' }}>
          <span style={{ fontSize:'0.85rem', color:'var(--text-primary)' }}>
            💾 Tienes un diagnóstico en progreso guardado — estás en el paso {step + 1} de {STEPS.length}.
          </span>
          <button
            onClick={() => { clearSaved(); setStep(0); setTri({}); setChecks({}); setSels({ dataSensitivity:'', regulation:'No aplica', providers:'', systems:'', patches:'', rto:'', training:'', providerClauses:'', reviewFreq:'12m' }); setRiskData({ personas:{label:'Seguridad en personas (A.6)',prob:0,impact:0}, fisico:{label:'Seguridad física (A.7)',prob:0,impact:0}, inc:{label:'Gestión de incidentes (A.16)',prob:0,impact:0} }); setAssets([]); setShowResume(false); }}
            style={{ background:'none', border:'1px solid rgba(59,130,246,.4)', color:'var(--accent)', fontSize:'0.78rem', padding:'0.3rem 0.85rem', borderRadius:6, cursor:'pointer', whiteSpace:'nowrap' }}
          >
            Empezar de nuevo
          </button>
        </div>
      )}

      {/* Contenido — sidebar + área principal */}
      <div style={{ flex:1, maxWidth:1000, width:'100%', margin:'0 auto', padding:'2.5rem 1.5rem', display:'flex', gap:'1.5rem', alignItems:'flex-start' }}>

        {/* Sidebar vertical */}
        <div className="glass-panel" style={{ width:210, flexShrink:0, padding:'1.25rem 1rem', position:'sticky', top:'4.5rem' }}>
          <div style={{ marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.4rem' }}>
              <span style={{ fontSize:'0.72rem', color:'var(--text-secondary)' }}>Progreso</span>
              <span style={{ fontSize:'0.72rem', color:'var(--success)', fontWeight:700 }}>{pct}%</span>
            </div>
            <div style={{ height:3, background:'rgba(255,255,255,.06)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:3, width:`${pct}%`, background:'linear-gradient(90deg,var(--accent),var(--success))', borderRadius:2, transition:'width .4s ease' }} />
            </div>
          </div>
          <Stepbar />
        </div>

        {/* Área de contenido */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          <div className="glass-panel" style={{ padding:'2rem' }}>
            {steps[step]}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <button onClick={()=>step>0&&setStep(s=>s-1)} disabled={step===0} style={{ padding:'0.75rem 1.75rem', borderRadius:8, fontSize:'0.9rem', fontWeight:600, cursor: step===0?'not-allowed':'pointer', background:'transparent', color: step===0?'var(--border)':'var(--text-secondary)', border:`1px solid ${step===0?'var(--border)':'rgba(255,255,255,.15)'}` }}>
              ← Anterior
            </button>
            <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)' }}>Paso {step+1} de {STEPS.length}</span>
            {step < STEPS.length-1 ? (
              <button onClick={()=>setStep(s=>s+1)} className="btn-primary" style={{ padding:'0.75rem 1.75rem', fontSize:'0.9rem' }}>
                Siguiente →
              </button>
            ) : (
              <button onClick={handleFinish} disabled={saving} className="btn-primary" style={{ padding:'0.75rem 2rem', fontSize:'0.9rem', opacity:saving?0.7:1, cursor:saving?'not-allowed':'pointer' }}>
                {saving ? 'Guardando...' : '✅ Generar perfil de cumplimiento'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticWizard;