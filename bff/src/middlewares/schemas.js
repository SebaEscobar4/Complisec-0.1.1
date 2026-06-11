import { z } from 'zod';

export const onboardingSchema = z.object({
  organization: z.object({
    name: z.string().min(2, "El nombre de la organización debe tener al menos 2 caracteres").max(255),
    industry: z.string().min(2, "La industria debe ser especificada").max(100),
    size: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"], {
      errorMap: () => ({ message: "El tamaño debe ser uno de: MICRO, SMALL, MEDIUM, LARGE" })
    })
  }),
  admin: z.object({
    name: z.string().min(2, "El nombre del administrador debe tener al menos 2 caracteres").max(255),
    email: z.string().email("Formato de correo electrónico inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
  })
});

export const assetSchema = z.object({
  name: z.string().min(2, "El nombre del activo debe tener al menos 2 caracteres").max(255),
  description: z.string().optional(),
  confidentiality_req: z.number().int().min(1).max(5),
  integrity_req: z.number().int().min(1).max(5),
  availability_req: z.number().int().min(1).max(5),
  organization_id: z.string().uuid("Formato de ID de organización inválido")
});

export const riskSchema = z.object({
  asset_id: z.string().uuid("Formato de ID de activo inválido"),
  organization_id: z.string().uuid("Formato de ID de organización inválido"),
  threat: z.string().min(3, "La descripción de la amenaza debe tener al menos 3 caracteres").max(255),
  vulnerability: z.string().min(3, "La descripción de la vulnerabilidad debe tener al menos 3 caracteres").max(255),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  treatment_decision: z.enum(["ACCEPT", "MITIGATE", "TRANSFER", "AVOID"], {
    errorMap: () => ({ message: "La decisión de tratamiento debe ser ACCEPT, MITIGATE, TRANSFER o AVOID" })
  }),
  residual_likelihood: z.number().int().min(1).max(5).optional(),
  residual_impact: z.number().int().min(1).max(5).optional()
});

export const soaSchema = z.object({
  organization_id: z.string().uuid("Formato de ID de organización inválido"),
  control_id: z.string().uuid("Formato de ID de control inválido"),
  is_applicable: z.boolean({
    required_error: "Debe especificar si el control es aplicable o no",
    invalid_type_error: "La aplicabilidad debe ser un valor booleano"
  }),
  justification: z.string().min(10, "La justificación debe tener al menos 10 caracteres (obligatorio según la norma)"),
  implementation_status: z.enum(["NOT_IMPLEMENTED", "PARTIAL", "FULLY_IMPLEMENTED"], {
    errorMap: () => ({ message: "El estado de implementación debe ser NOT_IMPLEMENTED, PARTIAL o FULLY_IMPLEMENTED" })
  }),
  risk_profile_id: z.string().uuid("Formato de ID de perfil de riesgo inválido").optional().nullable()
});

export const loginSchema = z.object({
  email: z.string().email("Formato de correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
});
