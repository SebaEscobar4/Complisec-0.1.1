import { query } from '../config/db.js';

const ALL_CONTROLS = [
  // ── Dominio 5: Organizacional (37 controles) ──────────────────────────────
  { domain:'Organizacional', number:'5.1',  name:'Políticas para la seguridad de la información', desc:'Definir, aprobar y publicar políticas de seguridad de la información comunicadas al personal relevante.' },
  { domain:'Organizacional', number:'5.2',  name:'Roles y responsabilidades en seguridad de la información', desc:'Asignar y comunicar las responsabilidades de seguridad de la información.' },
  { domain:'Organizacional', number:'5.3',  name:'Segregación de funciones', desc:'Segregar funciones conflictivas para reducir el riesgo de acceso no autorizado o modificación de activos.' },
  { domain:'Organizacional', number:'5.4',  name:'Responsabilidades de la dirección', desc:'Requerir que la dirección apoye la seguridad de la información conforme a las políticas y procedimientos.' },
  { domain:'Organizacional', number:'5.5',  name:'Contacto con autoridades', desc:'Mantener contactos apropiados con autoridades relevantes.' },
  { domain:'Organizacional', number:'5.6',  name:'Contacto con grupos de interés especial', desc:'Mantener contactos con grupos de interés especial u otros foros y asociaciones profesionales de seguridad.' },
  { domain:'Organizacional', number:'5.7',  name:'Inteligencia de amenazas', desc:'Recopilar y analizar información sobre amenazas de seguridad de la información para producir inteligencia de amenazas.' },
  { domain:'Organizacional', number:'5.8',  name:'Seguridad de la información en la gestión de proyectos', desc:'Integrar la seguridad de la información en la gestión de proyectos.' },
  { domain:'Organizacional', number:'5.9',  name:'Inventario de información y otros activos asociados', desc:'Identificar y gestionar un inventario de información y otros activos asociados, incluidos propietarios.' },
  { domain:'Organizacional', number:'5.10', name:'Uso aceptable de información y otros activos asociados', desc:'Identificar, documentar e implementar reglas para el uso aceptable y procedimientos para el manejo de información.' },
  { domain:'Organizacional', number:'5.11', name:'Devolución de activos', desc:'El personal y otras partes interesadas deben devolver todos los activos de la organización al cesar su empleo, contrato o acuerdo.' },
  { domain:'Organizacional', number:'5.12', name:'Clasificación de la información', desc:'Clasificar la información según las necesidades de seguridad de la información de la organización.' },
  { domain:'Organizacional', number:'5.13', name:'Etiquetado de la información', desc:'Desarrollar e implementar un conjunto apropiado de procedimientos para el etiquetado de información.' },
  { domain:'Organizacional', number:'5.14', name:'Transferencia de información', desc:'Implementar reglas, procedimientos o acuerdos de transferencia de información para todos los tipos de instalaciones de transferencia.' },
  { domain:'Organizacional', number:'5.15', name:'Control de acceso', desc:'Establecer e implementar reglas para controlar el acceso físico y lógico a información y otros activos asociados.' },
  { domain:'Organizacional', number:'5.16', name:'Gestión de identidad', desc:'Gestionar el ciclo de vida completo de las identidades.' },
  { domain:'Organizacional', number:'5.17', name:'Información de autenticación', desc:'Gestionar la asignación y el uso de información de autenticación con un proceso de gestión, incluyendo asesoramiento al personal.' },
  { domain:'Organizacional', number:'5.18', name:'Derechos de acceso', desc:'Aprovisionar, revisar, modificar y eliminar los derechos de acceso a información y otros activos asociados.' },
  { domain:'Organizacional', number:'5.19', name:'Seguridad de la información en las relaciones con proveedores', desc:'Definir e implementar procesos y procedimientos para gestionar los riesgos de seguridad de la información asociados con el uso de productos o servicios de proveedores.' },
  { domain:'Organizacional', number:'5.20', name:'Tratamiento de la seguridad de la información en los acuerdos con proveedores', desc:'Establecer y acordar requisitos relevantes de seguridad de la información con cada proveedor.' },
  { domain:'Organizacional', number:'5.21', name:'Gestión de la seguridad de la información en la cadena de suministro de TIC', desc:'Definir e implementar procesos y procedimientos para gestionar los riesgos de seguridad de la información asociados con la cadena de suministro de productos y servicios de TIC.' },
  { domain:'Organizacional', number:'5.22', name:'Seguimiento, revisión y gestión de cambios de los servicios de proveedores', desc:'Supervisar, revisar, evaluar y gestionar regularmente los cambios en las prácticas de seguridad de la información del proveedor.' },
  { domain:'Organizacional', number:'5.23', name:'Seguridad de la información para el uso de servicios en la nube', desc:'Establecer procesos para la adquisición, uso, gestión y salida de servicios en la nube.' },
  { domain:'Organizacional', number:'5.24', name:'Planificación y preparación de la gestión de incidentes de seguridad de la información', desc:'Planificar y prepararse para la gestión de incidentes de seguridad de la información definiendo, estableciendo y comunicando los procesos, roles y responsabilidades.' },
  { domain:'Organizacional', number:'5.25', name:'Evaluación y decisión sobre eventos de seguridad de la información', desc:'Evaluar los eventos de seguridad de la información y decidir si se clasifican como incidentes.' },
  { domain:'Organizacional', number:'5.26', name:'Respuesta a incidentes de seguridad de la información', desc:'Responder a los incidentes de seguridad de la información de acuerdo con los procedimientos documentados.' },
  { domain:'Organizacional', number:'5.27', name:'Aprendizaje de los incidentes de seguridad de la información', desc:'Utilizar el conocimiento adquirido de los incidentes de seguridad de la información para fortalecer los controles.' },
  { domain:'Organizacional', number:'5.28', name:'Recolección de evidencias', desc:'Establecer e implementar procedimientos para la identificación, recolección, adquisición y preservación de evidencias.' },
  { domain:'Organizacional', number:'5.29', name:'Seguridad de la información durante una disrupción', desc:'Planificar cómo mantener la seguridad de la información en un nivel apropiado durante la disrupción.' },
  { domain:'Organizacional', number:'5.30', name:'Preparación de TIC para la continuidad del negocio', desc:'Planificar, implementar, mantener y probar la preparación de TIC según los objetivos de continuidad del negocio.' },
  { domain:'Organizacional', number:'5.31', name:'Requisitos legales, estatutarios, reglamentarios y contractuales', desc:'Identificar, documentar y mantener actualizados los requisitos legales, estatutarios, reglamentarios y contractuales relevantes.' },
  { domain:'Organizacional', number:'5.32', name:'Derechos de propiedad intelectual', desc:'Implementar procedimientos apropiados para proteger los derechos de propiedad intelectual.' },
  { domain:'Organizacional', number:'5.33', name:'Protección de registros', desc:'Proteger los registros contra pérdida, destrucción, falsificación, acceso no autorizado y divulgación no autorizada.' },
  { domain:'Organizacional', number:'5.34', name:'Privacidad y protección de información de identificación personal', desc:'Identificar y cumplir con los requisitos relacionados con la preservación de la privacidad y protección de la PII.' },
  { domain:'Organizacional', number:'5.35', name:'Revisión independiente de la seguridad de la información', desc:'Revisar el enfoque de la organización para gestionar la seguridad de la información independientemente a intervalos planificados.' },
  { domain:'Organizacional', number:'5.36', name:'Cumplimiento de políticas, normas y estándares de seguridad de la información', desc:'Revisar regularmente el cumplimiento del procesamiento de información y procedimientos con la política, normas y estándares.' },
  { domain:'Organizacional', number:'5.37', name:'Procedimientos de operación documentados', desc:'Documentar procedimientos de operación para instalaciones de procesamiento de información y ponerlos a disposición del personal.' },

  // ── Dominio 6: Personas (8 controles) ─────────────────────────────────────
  { domain:'Personas', number:'6.1',  name:'Investigación de antecedentes', desc:'Realizar verificaciones de antecedentes de todos los candidatos a puestos de acuerdo con las leyes y ética empresarial.' },
  { domain:'Personas', number:'6.2',  name:'Términos y condiciones del empleo', desc:'Los acuerdos contractuales con el personal deben establecer sus responsabilidades de seguridad de la información.' },
  { domain:'Personas', number:'6.3',  name:'Concienciación, educación y formación en seguridad de la información', desc:'Proporcionar concienciación, educación y formación en seguridad apropiadas y actualizaciones periódicas.' },
  { domain:'Personas', number:'6.4',  name:'Proceso disciplinario', desc:'Formalizar y comunicar un proceso disciplinario para tomar medidas contra el personal que haya cometido una violación.' },
  { domain:'Personas', number:'6.5',  name:'Responsabilidades tras el cese o cambio de empleo', desc:'Definir y hacer cumplir las responsabilidades de seguridad de la información vigentes tras el cese o cambio de empleo.' },
  { domain:'Personas', number:'6.6',  name:'Acuerdos de confidencialidad o no divulgación', desc:'Identificar, documentar regularmente y revisar los requisitos de acuerdos de confidencialidad o no divulgación.' },
  { domain:'Personas', number:'6.7',  name:'Trabajo remoto', desc:'Implementar medidas de seguridad cuando el personal trabaja de forma remota para proteger la información.' },
  { domain:'Personas', number:'6.8',  name:'Reporte de eventos de seguridad de la información', desc:'Proporcionar al personal un mecanismo para reportar eventos de seguridad de la información observados o sospechados.' },

  // ── Dominio 7: Físico (14 controles) ──────────────────────────────────────
  { domain:'Físico', number:'7.1',  name:'Perímetros de seguridad física', desc:'Definir y usar perímetros de seguridad para proteger áreas que contienen información e instalaciones de procesamiento.' },
  { domain:'Físico', number:'7.2',  name:'Entrada física', desc:'Asegurar las áreas protegidas con controles de entrada apropiados para permitir solo acceso autorizado.' },
  { domain:'Físico', number:'7.3',  name:'Seguridad de oficinas, despachos e instalaciones', desc:'Diseñar y aplicar la seguridad física de oficinas, salas e instalaciones.' },
  { domain:'Físico', number:'7.4',  name:'Monitoreo de la seguridad física', desc:'Monitorear continuamente las instalaciones en busca de acceso físico no autorizado.' },
  { domain:'Físico', number:'7.5',  name:'Protección contra amenazas físicas y ambientales', desc:'Diseñar y aplicar protección contra amenazas físicas y ambientales como desastres naturales y otros.' },
  { domain:'Físico', number:'7.6',  name:'Trabajo en áreas seguras', desc:'Diseñar e implementar medidas de seguridad para trabajar en áreas seguras.' },
  { domain:'Físico', number:'7.7',  name:'Escritorio despejado y pantalla limpia', desc:'Definir e implementar reglas de escritorio despejado para papeles y medios de almacenamiento removibles.' },
  { domain:'Físico', number:'7.8',  name:'Ubicación y protección de equipos', desc:'Ubicar y proteger los equipos de forma segura para reducir los riesgos de las amenazas y peligros ambientales.' },
  { domain:'Físico', number:'7.9',  name:'Seguridad de activos fuera de las instalaciones', desc:'Proteger los activos fuera de las instalaciones teniendo en cuenta los diferentes riesgos de trabajar fuera de ellas.' },
  { domain:'Físico', number:'7.10', name:'Medios de almacenamiento', desc:'Gestionar los medios de almacenamiento a lo largo de su ciclo de vida de adquisición, uso, transporte y eliminación.' },
  { domain:'Físico', number:'7.11', name:'Servicios de suministro', desc:'Proteger los equipos de fallos de energía y otras disrupciones causadas por fallos en los servicios de suministro.' },
  { domain:'Físico', number:'7.12', name:'Seguridad del cableado', desc:'Proteger los cables que transportan energía, datos o servicios de soporte de información contra interceptación, interferencia o daño.' },
  { domain:'Físico', number:'7.13', name:'Mantenimiento de equipos', desc:'Mantener los equipos correctamente para garantizar su disponibilidad, integridad y confidencialidad.' },
  { domain:'Físico', number:'7.14', name:'Eliminación segura o reutilización de equipos', desc:'Verificar que todos los datos y software con licencia se hayan eliminado de forma segura antes de la eliminación o reutilización.' },

  // ── Dominio 8: Tecnológico (34 controles) ─────────────────────────────────
  { domain:'Tecnológico', number:'8.1',  name:'Dispositivos de punto final de usuario', desc:'Proteger la información almacenada, procesada o accesible a través de dispositivos de usuario.' },
  { domain:'Tecnológico', number:'8.2',  name:'Derechos de acceso privilegiado', desc:'Restringir y gestionar los derechos de acceso privilegiado.' },
  { domain:'Tecnológico', number:'8.3',  name:'Restricción de acceso a la información', desc:'Restringir el acceso a información y otros activos asociados según la política de control de acceso.' },
  { domain:'Tecnológico', number:'8.4',  name:'Acceso al código fuente', desc:'Gestionar apropiadamente el acceso de lectura y escritura al código fuente, herramientas de desarrollo y bibliotecas de software.' },
  { domain:'Tecnológico', number:'8.5',  name:'Autenticación segura', desc:'Implementar tecnologías y procedimientos de autenticación segura basados en restricciones de acceso a información.' },
  { domain:'Tecnológico', number:'8.6',  name:'Gestión de la capacidad', desc:'Supervisar y ajustar el uso de recursos, hacer proyecciones de requisitos de capacidad futura.' },
  { domain:'Tecnológico', number:'8.7',  name:'Protección contra malware', desc:'Implementar protección contra malware y apoyarla con la concienciación apropiada del usuario.' },
  { domain:'Tecnológico', number:'8.8',  name:'Gestión de vulnerabilidades técnicas', desc:'Obtener información sobre vulnerabilidades técnicas de los sistemas de información y tomar medidas apropiadas.' },
  { domain:'Tecnológico', number:'8.9',  name:'Gestión de la configuración', desc:'Establecer, documentar, implementar, supervisar y revisar configuraciones, incluidas configuraciones de seguridad de hardware, software, servicios y redes.' },
  { domain:'Tecnológico', number:'8.10', name:'Eliminación de información', desc:'Eliminar la información almacenada en sistemas de información, dispositivos o medios de almacenamiento cuando ya no sea necesaria.' },
  { domain:'Tecnológico', number:'8.11', name:'Enmascaramiento de datos', desc:'Usar el enmascaramiento de datos de acuerdo con la política de control de acceso de la organización basada en temas.' },
  { domain:'Tecnológico', number:'8.12', name:'Prevención de fuga de datos', desc:'Aplicar medidas de prevención de fuga de datos a sistemas, redes y otros dispositivos que procesan, almacenan o transmiten información sensible.' },
  { domain:'Tecnológico', number:'8.13', name:'Copias de seguridad de la información', desc:'Mantener y probar regularmente las copias de seguridad de la información, software y sistemas de acuerdo con la política de copia de seguridad.' },
  { domain:'Tecnológico', number:'8.14', name:'Redundancia de las instalaciones de procesamiento de información', desc:'Implementar instalaciones de procesamiento de información con redundancia suficiente para cumplir los requisitos de disponibilidad.' },
  { domain:'Tecnológico', number:'8.15', name:'Registro de actividad', desc:'Producir, almacenar, proteger y analizar registros que registren actividades, excepciones, fallas y otros eventos relevantes.' },
  { domain:'Tecnológico', number:'8.16', name:'Actividades de monitoreo', desc:'Supervisar redes, sistemas y aplicaciones para detectar comportamientos anómalos y tomar acciones apropiadas.' },
  { domain:'Tecnológico', number:'8.17', name:'Sincronización de relojes', desc:'Sincronizar los relojes de los sistemas de procesamiento de información de la organización con fuentes de tiempo de referencia aprobadas.' },
  { domain:'Tecnológico', number:'8.18', name:'Uso de programas de utilidad privilegiados', desc:'Controlar el uso de programas de utilidad que pueden ser capaces de anular los controles del sistema y la aplicación.' },
  { domain:'Tecnológico', number:'8.19', name:'Instalación de software en sistemas operativos', desc:'Implementar procedimientos para gestionar de forma segura la instalación de software en sistemas operativos.' },
  { domain:'Tecnológico', number:'8.20', name:'Seguridad de redes', desc:'Asegurar las redes y los dispositivos de red para proteger la información en los sistemas y aplicaciones.' },
  { domain:'Tecnológico', number:'8.21', name:'Seguridad de los servicios de red', desc:'Identificar, implementar y supervisar los mecanismos de seguridad de los servicios de red, junto con los requisitos de servicio.' },
  { domain:'Tecnológico', number:'8.22', name:'Segregación de redes', desc:'Segregar grupos de servicios de información, usuarios y sistemas de información en las redes de la organización.' },
  { domain:'Tecnológico', number:'8.23', name:'Filtrado web', desc:'Gestionar el acceso a sitios web externos para reducir la exposición a contenido malicioso.' },
  { domain:'Tecnológico', number:'8.24', name:'Uso de criptografía', desc:'Definir e implementar reglas para el uso efectivo de criptografía, incluida la gestión de claves criptográficas.' },
  { domain:'Tecnológico', number:'8.25', name:'Ciclo de vida de desarrollo seguro', desc:'Establecer y aplicar reglas para el desarrollo seguro de software y sistemas.' },
  { domain:'Tecnológico', number:'8.26', name:'Requisitos de seguridad de las aplicaciones', desc:'Identificar, especificar y aprobar los requisitos de seguridad de la información al desarrollar o adquirir aplicaciones.' },
  { domain:'Tecnológico', number:'8.27', name:'Principios de arquitectura de sistemas seguros', desc:'Establecer, documentar, mantener y aplicar principios para la ingeniería de sistemas seguros.' },
  { domain:'Tecnológico', number:'8.28', name:'Codificación segura', desc:'Aplicar principios de codificación segura al desarrollo de software.' },
  { domain:'Tecnológico', number:'8.29', name:'Pruebas de seguridad en el desarrollo y la aceptación', desc:'Definir e implementar procesos de prueba de seguridad en el ciclo de vida del desarrollo.' },
  { domain:'Tecnológico', number:'8.30', name:'Desarrollo subcontratado', desc:'Dirigir, supervisar y revisar las actividades relacionadas con el desarrollo de sistemas subcontratados.' },
  { domain:'Tecnológico', number:'8.31', name:'Separación de los entornos de desarrollo, prueba y producción', desc:'Separar y asegurar los entornos de desarrollo, prueba y producción.' },
  { domain:'Tecnológico', number:'8.32', name:'Gestión de cambios', desc:'Someter los cambios en instalaciones de procesamiento de información y sistemas de información a procedimientos de gestión del cambio.' },
  { domain:'Tecnológico', number:'8.33', name:'Información de prueba', desc:'Seleccionar, proteger y gestionar apropiadamente la información de prueba.' },
  { domain:'Tecnológico', number:'8.34', name:'Protección de los sistemas de información durante las pruebas de auditoría', desc:'Planificar y acordar las pruebas de auditoría y otras actividades de aseguramiento que involucran la evaluación de sistemas operativos.' },
];

export const seedControls = async () => {
  try {
    const result = await query('SELECT COUNT(*) FROM annex_a_controls');
    const count = parseInt(result.rows[0].count, 10);

    if (count < ALL_CONTROLS.length) {
      console.log(`Seeding ${ALL_CONTROLS.length} Annex A controls (ISO 27001:2022)...`);
      for (const c of ALL_CONTROLS) {
        await query(
          `INSERT INTO annex_a_controls (control_domain, control_number, control_name, description, objective)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (control_number) DO NOTHING`,
          [c.domain, c.number, c.name, c.desc, c.desc]
        );
      }
      console.log(`Annex A controls seeded: ${ALL_CONTROLS.length} controls.`);
    } else {
      console.log(`Annex A controls already exist (${count} found). Skipping seed.`);
    }
  } catch (error) {
    console.error('Error seeding controls:', error);
  }
};