/**
 * Diccionario de Tareas por Control ISO 27001
 * Asigna tareas prácticas y técnicas a controles específicos del Anexo A.
 */

export const CONTROL_TASKS = {
  // 5.15 - Access Control
  '5.15': [
    'Redactar y aprobar una política formal de control de acceso.',
    'Crear una matriz de roles y permisos para los sistemas críticos.',
    'Revisar y revocar accesos de usuarios inactivos o antiguos empleados.'
  ],
  // 5.17 - Authentication information
  '5.17': [
    'Implementar Doble Factor de Autenticación (MFA) en todos los sistemas expuestos.',
    'Establecer política de contraseñas (mínimo 12 caracteres, complejidad).',
    'Requerir el cambio de contraseñas por defecto en todos los equipos nuevos.'
  ],
  // 8.7 - Protection against malware
  '8.7': [
    'Adquirir licencias de software antimalware/EDR corporativo.',
    'Instalar el agente de protección en todos los endpoints y servidores.',
    'Configurar análisis automáticos semanales de sistema completo.',
    'Restringir la ejecución de software no autorizado (Application Whitelisting).'
  ],
  // 8.13 - Information backup
  '8.13': [
    'Definir una política de respaldos (frecuencia, retención y tipo).',
    'Configurar copias de seguridad automáticas en un entorno aislado (nube/físico).',
    'Realizar una prueba de restauración de datos al menos cada 6 meses.'
  ],
  // 8.20 - Networks security
  '8.20': [
    'Configurar reglas de Firewall para bloquear tráfico no autorizado.',
    'Segmentar la red Wi-Fi de invitados de la red corporativa.',
    'Implementar VPN obligatoria para accesos remotos a recursos internos.'
  ],
  // 7.1 - Physical security perimeters
  '7.1': [
    'Instalar cerraduras electrónicas o biométricas en el cuarto de servidores.',
    'Implementar cámaras de seguridad en los accesos principales.',
    'Mantener un registro (bitácora) de visitantes a las instalaciones.'
  ],
  // 6.3 - Information security awareness
  '6.3': [
    'Diseñar un programa anual de concientización en ciberseguridad.',
    'Realizar una simulación de Phishing a todos los empleados.',
    'Incluir la política de seguridad en el proceso de inducción de nuevo personal.'
  ],
  // 5.19 - Information security in supplier relationships
  '5.19': [
    'Incluir cláusulas de confidencialidad (NDA) en los contratos de proveedores.',
    'Exigir certificaciones de seguridad (ej. ISO 27001, SOC2) a proveedores Cloud.',
    'Realizar una auditoría anual o cuestionario de seguridad a proveedores críticos.'
  ],
  // 8.1 - User endpoint devices
  '8.1': [
    'Habilitar el cifrado de disco completo (BitLocker/FileVault) en laptops.',
    'Configurar bloqueo automático de pantalla tras 5 minutos de inactividad.',
    'Implementar un sistema MDM (Mobile Device Management) para borrado remoto.'
  ]
};
