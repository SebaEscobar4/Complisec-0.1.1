import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from './utils/axiosSetup';
import Layout from './components/layout/Layout';
import RegisterForm from './components/auth/RegisterForm';
import DiagnosticWizard from './components/onboarding/DiagnosticWizard';
import Login from './components/auth/Login';
import AssetList from './components/assets/AssetList';
import RiskAssessment from './components/risks/RiskAssessment';
import SoAList from './components/soa/SoAList';
import Dashboard from './components/dashboard/Dashboard';
import EvidenceRepository from './components/soa/EvidenceRepository';
import AuditList from './components/audits/AuditList';
import TaskBoard from './components/tasks/TaskBoard';

/**
 * Estados de la app:
 *   'login'       → pantalla de login
 *   'register'    → formulario de registro
 *   'diagnostic'  → wizard de diagnóstico (página completa, post-registro)
 *   'app'         → plataforma principal con dashboard
 */

function App() {
  const [appState, setAppState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'register' ? 'register' : 'login';
  });
  const [currentUser, setCurrentUser]     = useState(null);
  const [diagnosticRisks, setDiagnosticRisks] = useState([]);
  const [currentView, setCurrentView]     = useState('dashboard');
  const [viewParams, setViewParams]       = useState({});

  const handleNavigate = (view, params = {}) => {
    setCurrentView(view);
    setViewParams(params);
  };

  // ── Restaurar sesión desde token guardado ────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 > Date.now()) {
        const restoreUser = async () => {
          // Si el token no trae name (tokens emitidos antes del fix), lo pedimos al backend
          const name = decoded.name || await fetchUserName(token);
          const user = {
            id:              decoded.userId,
            name:            name || decoded.email || 'Usuario',
            organization_id: decoded.organizationId,
            role:            decoded.role,
          };
          setCurrentUser(user);
          checkAndSetState(user.organization_id, token);
        };
        restoreUser();
      } else {
        localStorage.removeItem('token');
      }
    } catch {
      localStorage.removeItem('token');
    }
  }, []);

  // ── Chequea si la org ya tiene diagnóstico guardado ──────────────────────
  const checkAndSetState = async (organizationId, token) => {
    try {
      const res = await axios.get(`/api/diagnostic?organization_id=${organizationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const risks = res.data.data || [];
      if (risks.length > 0) {
        setDiagnosticRisks(risks);
        setAppState('app');
      } else {
        // Sin diagnóstico → mostrar wizard
        setAppState('diagnostic');
      }
    } catch {
      // Si falla el check, ir directo a la app
      setAppState('app');
    }
  };

  // ── Post-login: cargar nombre si no viene en el JWT ──────────────────────
  const fetchUserName = async (token) => {
    try {
      const res = await axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      return res.data?.data?.name || 'Usuario';
    } catch {
      return 'Usuario';
    }
  };

  // ── Callback post-login ──────────────────────────────────────────────────
  const handleLoginSuccess = async (userData, token) => {
    const savedToken = token || localStorage.getItem('token');
    let name = userData.name;
    if (!name && savedToken) name = await fetchUserName(savedToken);

    const user = {
      id:              userData.id,
      name:            name || userData.email || 'Usuario',
      organization_id: userData.organization_id || userData.organizationId,
      role:            userData.role || 'ADMIN',
    };
    setCurrentUser(user);
    await checkAndSetState(user.organization_id, savedToken);
  };

  // ── Callback post-registro: siempre va al diagnóstico ───────────────────
  const handleRegisterSuccess = async (data) => {
    if (data.token) localStorage.setItem('token', data.token);

    const user = {
      id:              data.user?.id,
      name:            data.user?.name || 'Usuario',
      organization_id: data.organizationId || data.organization_id,
      role:            data.user?.role || 'ADMIN',
    };
    setCurrentUser(user);
    // Nuevo registro → siempre al diagnóstico, sin verificar BD
    setAppState('diagnostic');
  };

  // ── Callback al terminar el diagnóstico ──────────────────────────────────
  const handleDiagnosticComplete = (risks) => {
    if (risks && risks.length > 0) {
      setDiagnosticRisks(risks);
    }
    setAppState('app');
    handleNavigate('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setDiagnosticRisks([]);
    setAppState('login');
    handleNavigate('dashboard');
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

  // Login
  if (appState === 'login') {
    return (
      <Layout>
        <Login
          onLoginSuccess={handleLoginSuccess}
          onGoToRegister={() => setAppState('register')}
        />
      </Layout>
    );
  }

  // Registro
  if (appState === 'register') {
    return (
      <Layout>
        <RegisterForm
          onRegisterSuccess={handleRegisterSuccess}
          onGoToLogin={() => setAppState('login')}
        />
      </Layout>
    );
  }

  // Diagnóstico — página completa (sin Layout, ocupa toda la pantalla)
  if (appState === 'diagnostic') {
    return (
      <DiagnosticWizard
        organizationId={currentUser?.organization_id}
        userName={currentUser?.name}
        onComplete={handleDiagnosticComplete}
      />
    );
  }

  // App principal
  return (
    <Layout user={currentUser} onLogout={handleLogout}>
      <div className="main-content">

        {/* Navegación */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { key: 'dashboard', label: '📊 Dashboard' },
            { key: 'assets',    label: '🗃️ Activos'   },
            ...(currentUser?.role !== 'EMPLOYEE' ? [{ key: 'risks', label: '⚠️ Riesgos' }] : []),
            { key: 'tasks',     label: '✅ Tareas'     },
            { key: 'evidences', label: '📁 Evidencias' },
            { key: 'audits',    label: '🔍 Auditorías' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`btn-primary ${currentView === key ? '' : 'outline'}`}
              onClick={() => handleNavigate(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Vistas */}
        {currentView === 'dashboard' && (
          <Dashboard
            organizationId={currentUser?.organization_id}
            onNavigate={handleNavigate}
            diagnosticRisks={diagnosticRisks}
            onOpenDiagnostic={() => setAppState('diagnostic')}
          />
        )}
        {currentView === 'assets' && (
          <AssetList organizationId={currentUser?.organization_id} />
        )}
        {currentView === 'risks' && currentUser?.role !== 'EMPLOYEE' && (
          <RiskAssessment organizationId={currentUser?.organization_id} />
        )}
        {currentView === 'tasks' && (
          <TaskBoard organizationId={currentUser?.organization_id} />
        )}
        {currentView === 'audits' && (
          <AuditList organizationId={currentUser?.organization_id} />
        )}
        {currentView === 'evidences' && (
          <EvidenceRepository organizationId={currentUser?.organization_id} />
        )}
      </div>
    </Layout>
  );
}

export default App;