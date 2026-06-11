CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Organizaciones (Pymes)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    size VARCHAR(50),
    security_officer_name VARCHAR(255),
    security_officer_role VARCHAR(255),
    review_frequency VARCHAR(50) DEFAULT '12m',
    commitments JSONB,
    compliance_goals JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- e.g., ADMIN, CISO, AUDITOR
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventario de Activos
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    confidentiality_req INT CHECK (confidentiality_req BETWEEN 1 AND 5),
    integrity_req INT CHECK (integrity_req BETWEEN 1 AND 5),
    availability_req INT CHECK (availability_req BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Perfiles de Riesgo y Evaluación (Risk Assessment)
CREATE TABLE risk_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    threat VARCHAR(255) NOT NULL,
    vulnerability VARCHAR(255) NOT NULL,
    likelihood INT CHECK (likelihood BETWEEN 1 AND 5),
    impact INT CHECK (impact BETWEEN 1 AND 5),
    risk_level INT GENERATED ALWAYS AS (likelihood * impact) STORED,
    treatment_decision VARCHAR(50), -- ACCEPT, MITIGATE, TRANSFER, AVOID
    residual_likelihood INT CHECK (residual_likelihood BETWEEN 1 AND 5),
    residual_impact INT CHECK (residual_impact BETWEEN 1 AND 5),
    residual_risk_level INT GENERATED ALWAYS AS (residual_likelihood * residual_impact) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tareas de Mitigación de Riesgos
CREATE TABLE risk_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_profile_id UUID REFERENCES risk_profiles(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Catálogo de Controles del Anexo A (ISO/IEC 27001:2022 - 93 Controles)
CREATE TABLE annex_a_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_domain VARCHAR(50) NOT NULL, -- Organizational, People, Physical, Technological
    control_number VARCHAR(10) UNIQUE NOT NULL, -- e.g., 5.1, 8.1
    control_name VARCHAR(255) NOT NULL,
    description TEXT,
    objective TEXT
);

-- Statement of Applicability (SoA) - Declaración de Aplicabilidad
CREATE TABLE soa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    control_id UUID REFERENCES annex_a_controls(id) ON DELETE CASCADE,
    is_applicable BOOLEAN NOT NULL,
    justification TEXT NOT NULL, -- La justificación es obligatoria según la norma, aplique o no
    implementation_status VARCHAR(50), -- NOT_IMPLEMENTED, PARTIAL, FULLY_IMPLEMENTED
    risk_profile_id UUID REFERENCES risk_profiles(id) ON DELETE SET NULL, -- Trazabilidad al riesgo mitigado
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, control_id)
);

-- Gestión de Evidencias (Trazabilidad)
CREATE TABLE evidences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    soa_id UUID REFERENCES soa(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1024) NOT NULL, -- URL del S3
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    review_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_comment TEXT
);


CREATE TABLE IF NOT EXISTS diagnostic_risks (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
    domain_key       VARCHAR(20)  NOT NULL,   -- acceso, cripto, ops, inc, cont
    domain_label     VARCHAR(100) NOT NULL,   -- Control de acceso (A.9), etc.
    probability      INT          NOT NULL DEFAULT 0,  -- 0-100
    impact_value     INT          NOT NULL DEFAULT 0,  -- 0-100
    risk_score       INT          NOT NULL DEFAULT 0,  -- prob * impact / 100
    risk_level_label VARCHAR(20)  NOT NULL DEFAULT 'Bajo', -- Crítico, Alto, Medio, Bajo
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, domain_key)
);
