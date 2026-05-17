import React, { useState } from 'react';
import axios from '../../utils/axiosSetup';

// ─── Catálogo de activos predefinidos (mismo que DiagnosticWizard) ────────────
const ASSET_CATALOG = {
  'Base de datos de clientes': {
    category: 'Datos', c: 5, i: 5, a: 4,
    description: 'Registros personales, historiales y datos de contacto de clientes.',
    threats: [
      { threat: 'Acceso no autorizado a datos personales', vulnerability: 'Sin cifrado en reposo o control de acceso débil', likelihood: 4, impact: 5 },
      { threat: 'Exfiltración de datos por empleado interno', vulnerability: 'Sin logs de auditoría ni monitoreo de acceso', likelihood: 3, impact: 5 },
    ],
  },
  'Base de datos de empleados / RRHH': {
    category: 'Datos', c: 5, i: 4, a: 3,
    description: 'Contratos, remuneraciones, datos personales del equipo.',
    threats: [
      { threat: 'Filtración de datos sensibles de personal', vulnerability: 'Acceso no restringido por rol', likelihood: 3, impact: 4 },
    ],
  },
  'Correos corporativos': {
    category: 'Datos', c: 4, i: 3, a: 4,
    description: 'Servicio de correo electrónico empresarial.',
    threats: [
      { threat: 'Phishing o suplantación de identidad', vulnerability: 'Sin MFA activado en cuentas de correo', likelihood: 4, impact: 4 },
    ],
  },
  'Repositorio de código fuente': {
    category: 'Datos', c: 4, i: 5, a: 3,
    description: 'Git o similar con el código de los sistemas.',
    threats: [
      { threat: 'Robo de propiedad intelectual', vulnerability: 'Repositorios públicos o sin control de acceso', likelihood: 3, impact: 5 },
    ],
  },
  'Sistema ERP / contabilidad': {
    category: 'Sistemas', c: 4, i: 5, a: 5,
    description: 'Sistema de gestión empresarial, facturación o contabilidad.',
    threats: [
      { threat: 'Manipulación de registros financieros', vulnerability: 'Sin segregación de funciones en el sistema', likelihood: 3, impact: 5 },
      { threat: 'Ransomware que cifra los datos contables', vulnerability: 'Backups no probados o sin aislamiento', likelihood: 3, impact: 5 },
    ],
  },
  'Aplicación web / sitio corporativo': {
    category: 'Sistemas', c: 3, i: 4, a: 5,
    description: 'Sitio web, portal de clientes o aplicación web pública.',
    threats: [
      { threat: 'Inyección SQL o defacement', vulnerability: 'Sin escaneo de vulnerabilidades periódico', likelihood: 3, impact: 4 },
    ],
  },
  'Sistema de backups': {
    category: 'Sistemas', c: 3, i: 4, a: 5,
    description: 'Solución de respaldo de datos críticos.',
    threats: [
      { threat: 'Backups cifrados por ransomware', vulnerability: 'Backups conectados permanentemente a la red', likelihood: 3, impact: 5 },
      { threat: 'Falla de restauración en incidente', vulnerability: 'Backups no probados regularmente', likelihood: 4, impact: 5 },
    ],
  },
  'Servidor principal / on-premise': {
    category: 'Infraestructura', c: 4, i: 4, a: 5,
    description: 'Servidor físico o virtual que aloja aplicaciones críticas.',
    threats: [
      { threat: 'Acceso físico no autorizado al servidor', vulnerability: 'Sin control de acceso físico al datacenter', likelihood: 2, impact: 4 },
      { threat: 'Vulnerabilidades del sistema operativo', vulnerability: 'Sin gestión de parches periódica', likelihood: 3, impact: 4 },
    ],
  },
  'Servicios en la nube (AWS / Azure / GCP)': {
    category: 'Infraestructura', c: 4, i: 4, a: 4,
    description: 'Infraestructura cloud que soporta los sistemas de la organización.',
    threats: [
      { threat: 'Configuración incorrecta de permisos cloud', vulnerability: 'Sin revisión periódica de configuración', likelihood: 4, impact: 4 },
    ],
  },
  'Red corporativa / VPN': {
    category: 'Infraestructura', c: 3, i: 3, a: 5,
    description: 'Infraestructura de red local y acceso remoto.',
    threats: [
      { threat: 'Acceso remoto no autorizado', vulnerability: 'VPN sin MFA o con credenciales débiles', likelihood: 3, impact: 4 },
    ],
  },
  'Notebooks / laptops de empleados': {
    category: 'Hardware', c: 4, i: 3, a: 3,
    description: 'Computadores portátiles usados por el equipo.',
    threats: [
      { threat: 'Robo o pérdida del dispositivo', vulnerability: 'Sin cifrado de disco (BitLocker / FileVault)', likelihood: 3, impact: 4 },
      { threat: 'Malware instalado por el usuario', vulnerability: 'Sin EDR ni política de instalación de software', likelihood: 3, impact: 3 },
    ],
  },
  'Teléfonos móviles corporativos': {
    category: 'Hardware', c: 4, i: 2, a: 3,
    description: 'Smartphones con acceso a correo y sistemas corporativos.',
    threats: [
      { threat: 'Pérdida del dispositivo con acceso a sistemas', vulnerability: 'Sin MDM ni borrado remoto configurado', likelihood: 3, impact: 3 },
    ],
  },
  'Dispositivos de red (router, firewall, switches)': {
    category: 'Hardware', c: 3, i: 4, a: 5,
    description: 'Equipos de red que gestionan el tráfico corporativo.',
    threats: [
      { threat: 'Explotación de vulnerabilidades de firmware', vulnerability: 'Firmware desactualizado sin parches', likelihood: 3, impact: 4 },
    ],
  },
  'Credenciales de administrador de sistemas': {
    category: 'Credenciales', c: 5, i: 5, a: 3,
    description: 'Cuentas con privilegios elevados sobre sistemas críticos.',
    threats: [
      { threat: 'Compromiso de cuenta privilegiada', vulnerability: 'Sin MFA ni gestión de contraseñas (PAM)', likelihood: 4, impact: 5 },
    ],
  },
  'Contratos con clientes / proveedores': {
    category: 'Documentación', c: 4, i: 4, a: 2,
    description: 'Acuerdos legales, NDA, contratos de servicio.',
    threats: [
      { threat: 'Filtración de condiciones contractuales', vulnerability: 'Contratos sin control de acceso', likelihood: 2, impact: 3 },
    ],
  },
};

const CATEGORIES = [...new Set(Object.values(ASSET_CATALOG).map(a => a.category))];

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
const AssetForm = ({ organizationId, initialData, onSuccess, onCancel }) => {
  const isEditing = !!initialData;

  const [mode, setMode]           = useState(isEditing ? 'manual' : 'catalog'); // 'catalog' | 'manual'
  const [catFilter, setCatFilter] = useState('');

  const [formData, setFormData] = useState({
    name:                initialData?.name                || '',
    description:         initialData?.description         || '',
    confidentiality_req: initialData?.confidentiality_req ?? 3,
    integrity_req:       initialData?.integrity_req       ?? 3,
    availability_req:    initialData?.availability_req    ?? 3,
    organization_id:     organizationId,
  });
  const [pendingThreats, setPendingThreats] = useState([]);
  const [formErrors, setFormErrors]         = useState({});
  const [serverError, setServerError]       = useState('');
  const [isSubmitting, setIsSubmitting]     = useState(false);

  // Seleccionar activo del catálogo → pre-rellenar formulario
  const selectFromCatalog = (name, data) => {
    setFormData(prev => ({
      ...prev,
      name,
      description:         data.description,
      confidentiality_req: data.c,
      integrity_req:       data.i,
      availability_req:    data.a,
    }));
    setPendingThreats(data.threats || []);
    setMode('manual'); // pasar al formulario pre-rellenado
    setFormErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'range' ? parseInt(value, 10) : value,
    }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); setFormErrors({}); setServerError('');

    const errs = {};
    if (!formData.name.trim()) errs.name = 'El nombre del activo es obligatorio.';
    if (Object.keys(errs).length) { setFormErrors(errs); setIsSubmitting(false); return; }

    try {
      let response;
      if (isEditing) {
        response = await axios.put(`/api/assets/${initialData.id}`, formData);
      } else {
        response = await axios.post('/api/assets', formData);
      }

      const savedAsset = response.data.data;

      // Crear riesgos automáticos si vienen del catálogo
      if (!isEditing && pendingThreats.length > 0 && savedAsset?.id) {
        await Promise.all(pendingThreats.map(t =>
          axios.post('/api/risks', {
            organization_id:    organizationId,
            asset_id:           savedAsset.id,
            threat:             t.threat,
            vulnerability:      t.vulnerability,
            likelihood:         t.likelihood,
            impact:             t.impact,
            treatment_decision: 'MITIGATE',
          }).catch(() => {})
        ));
      }

      onSuccess(savedAsset);
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.details) {
        const map = {};
        error.response.data.details.forEach(e => { map[e.path] = e.message; });
        setFormErrors(map);
      } else {
        setServerError(error.response?.data?.message || 'Error inesperado. Inténtelo de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cia  = formData.confidentiality_req + formData.integrity_req + formData.availability_req;
  const ciaColor = cia >= 12 ? 'var(--danger)' : cia >= 8 ? 'var(--warning)' : 'var(--success)';
  const ciaLabel = cia >= 12 ? 'Alta' : cia >= 8 ? 'Media' : 'Baja';

  // ── Vista catálogo ──────────────────────────────────────────────────────────
  if (mode === 'catalog') {
    return (
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700 }}>Registrar activo</h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Selecciona del catálogo para pre-rellenar valores automáticamente, o registra uno manualmente.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setMode('manual')}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: 6, cursor: 'pointer' }}>
              Registrar manualmente
            </button>
            {onCancel && (
              <button onClick={onCancel}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: 6, cursor: 'pointer' }}>
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Filtros de categoría */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button onClick={() => setCatFilter('')}
            style={{ padding: '0.3rem 0.85rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1px solid ${!catFilter ? 'var(--accent)' : 'var(--border)'}`, background: !catFilter ? 'rgba(59,130,246,.1)' : 'transparent', color: !catFilter ? 'var(--accent)' : 'var(--text-secondary)' }}>
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              style={{ padding: '0.3rem 0.85rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `1px solid ${catFilter === cat ? 'var(--accent)' : 'var(--border)'}`, background: catFilter === cat ? 'rgba(59,130,246,.1)' : 'transparent', color: catFilter === cat ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de activos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', maxHeight: 320, overflowY: 'auto' }}>
          {Object.entries(ASSET_CATALOG)
            .filter(([, a]) => !catFilter || a.category === catFilter)
            .map(([name, a]) => {
              const cia = a.c + a.i + a.a;
              const cc  = cia >= 12 ? 'var(--danger)' : cia >= 8 ? 'var(--warning)' : 'var(--success)';
              return (
                <div key={name} onClick={() => selectFromCatalog(name, a)}
                  style={{ padding: '0.85rem', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'rgba(255,255,255,.03)', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,.4)'; e.currentTarget.style.background = 'rgba(59,130,246,.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,.03)'; }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '0.35rem' }}>{name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{a.category}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      {[['C', a.c], ['I', a.i], ['A', a.a]].map(([l, v]) => (
                        <span key={l} style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(255,255,255,.07)', borderRadius: 4, padding: '1px 5px', color: 'var(--text-secondary)' }}>
                          {l}:{v}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: cc }}>
                      {cia >= 12 ? 'Alta' : cia >= 8 ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  {a.threats?.length > 0 && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      {a.threats.length} amenaza{a.threats.length !== 1 ? 's' : ''} detectada{a.threats.length !== 1 ? 's' : ''} automaticamente
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  // ── Vista formulario (manual o pre-rellenado del catálogo) ──────────────────
  return (
    <div className="glass-panel" style={{ marginBottom: '2rem', borderLeft: isEditing ? '3px solid var(--warning)' : pendingThreats.length > 0 ? '3px solid var(--accent)' : undefined }}>
      <form onSubmit={handleSubmit} data-testid="asset-form">

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700 }}>
              {isEditing ? `Editando: ${initialData.name}` : 'Registrar activo'}
            </h3>
            {pendingThreats.length > 0 && !isEditing && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--accent)' }}>
                Se crearán {pendingThreats.length} riesgo{pendingThreats.length !== 1 ? 's' : ''} automáticamente al guardar.
              </p>
            )}
          </div>
          {!isEditing && (
            <button type="button" onClick={() => setMode('catalog')}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.78rem', padding: '0.3rem 0.75rem', borderRadius: 6, cursor: 'pointer' }}>
              ← Volver al catálogo
            </button>
          )}
        </div>

        {serverError && <div className="alert-error" style={{ marginBottom: '1rem' }}>{serverError}</div>}

        {/* Nombre */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="asset-name">Nombre del activo *</label>
          <input
            id="asset-name" type="text" name="name"
            value={formData.name} onChange={handleChange}
            className={formErrors.name ? 'input-error' : ''}
            placeholder="Ej: Base de datos de clientes, Servidor web..."
            data-testid="input-asset-name"
          />
          {formErrors.name && <span className="error-text">{formErrors.name}</span>}
        </div>

        {/* Descripción */}
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="asset-desc">Descripción</label>
          <input
            id="asset-desc" type="text" name="description"
            value={formData.description} onChange={handleChange}
            placeholder="Descripción breve del activo..."
            data-testid="input-asset-desc"
          />
        </div>

        {/* Valoración C-I-A */}
        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Valoración C-I-A</span>
            <span style={{ fontWeight: 700, color: ciaColor, fontSize: '0.9rem' }}>
              Criticidad {ciaLabel} — {cia}/15
            </span>
          </div>
          {[
            { name: 'confidentiality_req', label: 'Confidencialidad', hint: 'Impacto si los datos son expuestos' },
            { name: 'integrity_req',       label: 'Integridad',       hint: 'Impacto si los datos son alterados' },
            { name: 'availability_req',    label: 'Disponibilidad',   hint: 'Impacto si el activo deja de funcionar' },
          ].map(({ name, label, hint }) => (
            <div key={name} style={{ marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</label>
                <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.85rem' }}>{formData[name]}/5</span>
              </div>
              <input
                type="range" min="1" max="5" name={name}
                value={formData[name]} onChange={handleChange}
                style={{ width: '100%' }}
                data-testid={`slider-asset-${name[0]}`}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hint}</span>
            </div>
          ))}
        </div>

        {/* Riesgos automáticos que se crearán */}
        {pendingThreats.length > 0 && !isEditing && (
          <div style={{ marginBottom: '1.25rem', background: 'rgba(59,130,246,.05)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 10, padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Riesgos que se crearán automáticamente
            </div>
            {pendingThreats.map((t, i) => {
              const level = t.likelihood * t.impact;
              const rc = level >= 15 ? 'var(--danger)' : level >= 8 ? 'var(--warning)' : 'var(--success)';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: i < pendingThreats.length - 1 ? '0.4rem' : 0 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: 1 }}>{t.threat}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: rc, background: `${rc}18`, borderRadius: 8, padding: '1px 7px', flexShrink: 0 }}>
                    {level >= 15 ? 'Crítico' : level >= 8 ? 'Alto' : 'Bajo'} ({level})
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {(isEditing || onCancel) && (
            <button type="button" className="btn-primary outline" onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            data-testid="submit-asset-btn"
            style={{ flex: 1 }}
          >
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar activo'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetForm;
