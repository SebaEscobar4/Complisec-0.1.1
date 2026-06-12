import React, { useState } from 'react';
import axios from '../../utils/axiosSetup';

const RiskForm = ({ organizationId, assetId, assets, initialData, onSuccess, onCancel }) => {
  const isEditing = !!initialData;
  const needsAssetSelect = !assetId && !isEditing;

  const [formData, setFormData] = useState({
    organization_id:    organizationId,
    asset_id:           assetId || initialData?.asset_id || '',
    threat:             initialData?.threat             || '',
    vulnerability:      initialData?.vulnerability      || '',
    likelihood:         initialData?.likelihood         ?? 3,
    impact:             initialData?.impact             ?? 3,
    treatment_decision: initialData?.treatment_decision || 'MITIGATE',
    residual_likelihood: initialData?.residual_likelihood ?? 2,
    residual_impact:     initialData?.residual_impact     ?? 2,
  });

  const [formErrors, setFormErrors]     = useState({});
  const [serverError, setServerError]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'range' ? parseInt(value, 10) : value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); setFormErrors({}); setServerError('');

    // Validación local
    const errs = {};
    if (needsAssetSelect && !formData.asset_id) errs.asset_id = 'Selecciona un activo.';
    if (!formData.threat.trim())         errs.threat        = 'La amenaza es obligatoria.';
    if (!formData.vulnerability.trim())  errs.vulnerability = 'La vulnerabilidad es obligatoria.';
    if (Object.keys(errs).length) { setFormErrors(errs); setIsSubmitting(false); return; }

    try {
      let response;
      if (isEditing) {
        response = await axios.put(`/api/risks/${initialData.id}`, formData);
      } else {
        response = await axios.post('/api/risks', formData);
      }
      onSuccess(response.data.data);
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

  const riskScore = formData.likelihood * formData.impact;
  const riskColor = riskScore >= 15 ? 'var(--danger)' : riskScore >= 8 ? 'var(--warning)' : 'var(--success)';
  const riskLabel = riskScore >= 15 ? 'CRÍTICO' : riskScore >= 8 ? 'ALTO' : 'BAJO';

  const residualScore = formData.residual_likelihood * formData.residual_impact;
  const residualColor = residualScore >= 15 ? 'var(--danger)' : residualScore >= 8 ? 'var(--warning)' : 'var(--success)';
  const residualLabel = residualScore >= 15 ? 'CRÍTICO' : residualScore >= 8 ? 'ALTO' : 'BAJO';

  return (
    <div className="glass-panel" style={{ marginTop:'1rem', borderLeft:`4px solid ${isEditing ? 'var(--warning)' : 'var(--accent)'}` }}>
      <form onSubmit={handleSubmit} data-testid="risk-form">
        <fieldset>
          <legend>{isEditing ? `✏️ Editando riesgo: ${initialData.threat}` : 'Evaluar Riesgo'}</legend>

          {serverError && <div className="alert-error">{serverError}</div>}

          {needsAssetSelect && (
            <div className="form-group">
              <label htmlFor="risk-asset">Activo *</label>
              <select
                id="risk-asset" name="asset_id"
                value={formData.asset_id} onChange={handleChange}
                className={formErrors.asset_id ? 'input-error' : ''}
                data-testid="select-risk-asset"
              >
                <option value="">Seleccionar activo...</option>
                {(assets || []).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {formErrors.asset_id && <span className="error-text">{formErrors.asset_id}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="risk-threat">Amenaza *</label>
            <input
              id="risk-threat" type="text" name="threat"
              value={formData.threat} onChange={handleChange}
              className={formErrors.threat ? 'input-error' : ''}
              placeholder="Ej: Ransomware, Acceso no autorizado, Falla de hardware..."
              data-testid="input-risk-threat"
            />
            {formErrors.threat && <span className="error-text" data-testid="error-risk-threat">{formErrors.threat}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="risk-vuln">Vulnerabilidad *</label>
            <input
              id="risk-vuln" type="text" name="vulnerability"
              value={formData.vulnerability} onChange={handleChange}
              className={formErrors.vulnerability ? 'input-error' : ''}
              placeholder="Ej: Sistemas sin parchear, Contraseñas débiles, Sin cifrado..."
              data-testid="input-risk-vuln"
            />
            {formErrors.vulnerability && <span className="error-text" data-testid="error-risk-vuln">{formErrors.vulnerability}</span>}
          </div>

          <div style={{ background:'rgba(0,0,0,0.15)', borderRadius:'.75rem', padding:'1rem', marginTop:'.5rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem', alignItems:'center' }}>
              <span style={{ fontWeight:600, fontSize:'.9rem' }}>Valoración del riesgo</span>
              <span style={{ fontWeight:700, color:riskColor, fontSize:'1.1rem' }}>Nivel: {riskScore} — {riskLabel}</span>
            </div>
            <div style={{ display:'flex', gap:'2rem' }}>
              {[
                { name:'likelihood', label:'Probabilidad' },
                { name:'impact',     label:'Impacto' },
              ].map(({ name, label }) => (
                <div className="form-group" key={name} style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <label>{label}</label>
                    <span style={{ fontWeight:700, color:'var(--accent)' }}>{formData[name]}/5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" name={name}
                    value={formData[name]} onChange={handleChange} style={{ width:'100%' }}
                    data-testid={`slider-risk-${name}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginTop:'1rem' }}>
            <label htmlFor="treatment-decision">Decisión de Tratamiento</label>
            <select
              id="treatment-decision" name="treatment_decision"
              value={formData.treatment_decision} onChange={handleChange}
              className={formErrors.treatment_decision ? 'input-error' : ''}
              data-testid="select-treatment"
            >
              <option value="MITIGATE">Mitigar — Implementar controles</option>
              <option value="ACCEPT">Aceptar — Riesgo dentro de tolerancia</option>
              <option value="TRANSFER">Transferir — Seguro o tercerización</option>
              <option value="AVOID">Evitar — Cesar la actividad</option>
            </select>
          </div>

          {formData.treatment_decision === 'MITIGATE' && (
            <div style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'.75rem', padding:'1rem', marginTop:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem', alignItems:'center' }}>
                <span style={{ fontWeight:600, fontSize:'.9rem', color: 'var(--accent)' }}>🎯 Evaluación Residual (Después de mitigar)</span>
                <span style={{ fontWeight:700, color:residualColor, fontSize:'1.1rem' }}>Nivel: {residualScore} — {residualLabel}</span>
              </div>
              <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                Estima cuál será el riesgo una vez que apliques los controles.
              </p>
              <div style={{ display:'flex', gap:'2rem' }}>
                {[
                  { name:'residual_likelihood', label:'Prob. Residual' },
                  { name:'residual_impact',     label:'Imp. Residual' },
                ].map(({ name, label }) => (
                  <div className="form-group" key={name} style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <label>{label}</label>
                      <span style={{ fontWeight:700, color:'var(--accent)' }}>{formData[name]}/5</span>
                    </div>
                    <input
                      type="range" min="1" max="5" name={name}
                      value={formData[name]} onChange={handleChange} style={{ width:'100%' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:'1rem', marginTop:'1.5rem' }}>
            <button type="button" className="btn-primary outline" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting} data-testid="submit-risk-btn" style={{ flex:1 }}>
              {isSubmitting ? 'Guardando…' : isEditing ? '💾 Guardar cambios' : 'Guardar Perfil de Riesgo'}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
};

export default RiskForm;