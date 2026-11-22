import { BRAND } from '@/config/brand';
import { APPOINTMENT_STATUS_META, APPOINTMENT_TYPE_LABELS } from '@/config/status';
import {
  appointmentsService,
  doctorPortalService,
  documentsService,
  medicalRequestsService,
  notificationsService,
  patientHistoryService,
} from '@/services';
import type { AppointmentType, DocumentCategory, Patient, WhatsAppConversation, WhatsAppMessage } from '@/types';
import { addMinutesToTime, combineDateAndTime } from '@/utils/date';
import { formatDate, formatDNI, formatTime } from '@/utils/format';
import { getDoctorAvailableDates } from './availability';
import {
  buildClinicalScopeDisclaimer,
  buildEmergencyProtocolMessage,
  isClinicalAdviceRequest,
  isEmergencyMessage,
  normalizeText,
} from './safety';
import type {
  BotEngineContext,
  BotTurnOutcome,
  ChatAttachment,
  ChatQuickAction,
  ConversationSession,
} from './types';

const BOT_NAME = `Asistente ${BRAND.shortName}`;

let msgCounter = 1;
function makeMsg(
  sender: WhatsAppMessage['sender'],
  senderName: string,
  text: string,
  offsetMs = 0,
): WhatsAppMessage {
  msgCounter += 1;
  return {
    id: `wa-msg-${Date.now()}-${msgCounter}`,
    sender,
    senderName,
    text,
    sentAt: new Date(Date.now() + offsetMs).toISOString(),
  };
}

export function buildMainMenuActions(): ChatQuickAction[] {
  return [
    { id: 'menu-turnos', label: '📅 Solicitar turno', value: 'menu:turnos', variant: 'primary' },
    { id: 'menu-gestion', label: '🗓️ Mis turnos', value: 'menu:gestion_turnos' },
    { id: 'menu-recetas', label: '💊 Solicitar receta', value: 'menu:recetas' },
    { id: 'menu-docs', label: '📄 Enviar documentación', value: 'menu:documentacion' },
    { id: 'menu-humano', label: '🧑‍💼 Hablar con operador', value: 'menu:atencion_humana' },
  ];
}

export function createInitialMessagesForNewChat(): WhatsAppMessage[] {
  return [
    makeMsg(
      'bot',
      BOT_NAME,
      `¡Hola! 👋 Soy el asistente virtual del **${BRAND.name}**.\n\nPuedo ayudarte con turnos, solicitudes de recetas para revisión médica, envío de documentación o derivarte con recepción.\n_(No realizo diagnósticos ni prescripciones médicas.)_`,
    ),
    makeMsg(
      'bot',
      BOT_NAME,
      'Para comenzar y resguardar tus datos personales, por favor ingresá tu **número de DNI** (sin puntos).',
      300,
    ),
  ];
}

export function createSessionForConversation(
  conv: WhatsAppConversation,
  preVerified: boolean,
): ConversationSession {
  if (!preVerified || !conv.patientId) {
    return {
      verified: false,
      verificationAttempts: 0,
      flow: 'bienvenida',
      step: 'ask_dni',
      quickActions: [],
      booking: {},
      manage: {},
      prescription: {},
      document: {},
    };
  }

  return {
    verified: true,
    verifiedPatientId: conv.patientId,
    verificationAttempts: 0,
    flow: conv.botEnabled ? 'menu' : 'atencion_humana',
    step: conv.botEnabled ? 'idle' : 'handed_off',
    quickActions: conv.botEnabled ? buildMainMenuActions() : [],
    booking: {},
    manage: {},
    prescription: {},
    document: {},
  };
}

function formatBirthDateDDMMYYYY(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

function matchesSecondaryVerification(patient: Patient, input: string): boolean {
  const clean = input.trim();
  const expectedDDMMYYYY = formatBirthDateDDMMYYYY(patient.birthDate);
  if (clean === expectedDDMMYYYY || clean === patient.birthDate) return true;

  // Permitir también D/M/AAAA sin ceros a la izquierda
  const slashMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(clean);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    const normalized = `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
    if (normalized === expectedDDMMYYYY) return true;
  }

  // O últimos 4 dígitos numéricos del número de afiliado
  const inputDigits = clean.replace(/\D/g, '');
  const affDigits = patient.coverage.affiliateNumber.replace(/\D/g, '');
  if (inputDigits.length === 4 && affDigits.endsWith(inputDigits)) return true;

  return false;
}

const SAMPLE_DOCS_BY_TYPE: Record<'Derivación' | 'Estudio' | 'Receta' | 'Informe', ChatAttachment[]> = {
  Derivación: [
    { name: 'Derivacion_Oncologia_Clinica.pdf', fileType: 'pdf', sizeKb: 420, categoryLabel: 'Derivación' },
    { name: 'Orden_Derivacion_Medico_Cabecera.jpg', fileType: 'imagen', sizeKb: 680, categoryLabel: 'Derivación' },
  ],
  Estudio: [
    { name: 'Laboratorio_Hemograma_Completo.pdf', fileType: 'pdf', sizeKb: 510, categoryLabel: 'Estudio' },
    { name: 'TAC_Torax_Abdomen_Control.pdf', fileType: 'pdf', sizeKb: 1840, categoryLabel: 'Estudio' },
  ],
  Receta: [
    { name: 'Receta_Anterior_Esquema_Actual.pdf', fileType: 'pdf', sizeKb: 310, categoryLabel: 'Receta' },
    { name: 'Foto_Receta_Farmacia.jpg', fileType: 'imagen', sizeKb: 540, categoryLabel: 'Receta' },
  ],
  Informe: [
    { name: 'Informe_Anatomia_Patologica.pdf', fileType: 'pdf', sizeKb: 760, categoryLabel: 'Informe' },
    { name: 'Resumen_Historia_Clinica_Externa.pdf', fileType: 'pdf', sizeKb: 620, categoryLabel: 'Informe' },
  ],
};

function mapDocTypeToCategory(docType: 'Derivación' | 'Estudio' | 'Receta' | 'Informe'): DocumentCategory {
  if (docType === 'Estudio') return 'estudio';
  if (docType === 'Receta') return 'receta';
  if (docType === 'Informe') return 'informe';
  return 'otro';
}

function getActivePatient(ctx: BotEngineContext, session: ConversationSession): Patient | undefined {
  const id = session.verifiedPatientId;
  return id ? ctx.patients.find((p) => p.id === id) : undefined;
}

function goToMenu(session: ConversationSession, text: string): { botText: string; nextSession: ConversationSession } {
  return {
    botText: text,
    nextSession: {
      ...session,
      flow: 'menu',
      step: 'idle',
      quickActions: buildMainMenuActions(),
      booking: {},
      manage: {},
      prescription: {},
      document: {},
    },
  };
}

export async function processPatientTurn(
  ctx: BotEngineContext,
  session: ConversationSession,
  rawInput: string,
  options?: { displayLabel?: string; attachment?: ChatAttachment },
): Promise<BotTurnOutcome> {
  const input = rawInput.trim();
  const displayText = options?.displayLabel ?? input;
  const patient = getActivePatient(ctx, session);
  const senderLabel = patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente';

  const patientMsg = makeMsg('paciente', senderLabel, displayText);
  const attachments: Record<string, ChatAttachment> = {};
  if (options?.attachment) {
    attachments[patientMsg.id] = options.attachment;
  }

  // Si el bot está pausado (en atención humana), solo registramos el mensaje del paciente.
  if (!ctx.conversation.botEnabled) {
    return {
      messages: [patientMsg],
      nextSession: { ...session, quickActions: [] },
      attachments,
    };
  }

  // 1) Protocolo institucional de urgencias (prioridad máxima, incluso sin verificar identidad).
  if (isEmergencyMessage(input) && !input.startsWith('handoff:')) {
    const sysMsg = makeMsg(
      'sistema',
      'Sistema',
      'Protocolo institucional de urgencias activado automáticamente.',
      150,
    );
    const botMsg = makeMsg('bot', BOT_NAME, buildEmergencyProtocolMessage(), 350);
    const nextActions: ChatQuickAction[] = [
      { id: 'urg-handoff', label: '🚨 Derivar urgente a Recepción', value: 'handoff:Recepción:urgencia', variant: 'danger' },
      ...(session.verified
        ? [{ id: 'urg-menu', label: 'Volver al menú principal', value: 'cmd:menu' }]
        : []),
    ];
    return {
      messages: [patientMsg, sysMsg, botMsg],
      nextSession: { ...session, quickActions: nextActions },
      conversationPatch: {
        tags: Array.from(new Set([...ctx.conversation.tags, 'Protocolo urgencia'])),
      },
      attachments,
      toast: {
        title: 'Protocolo de urgencias activado',
        description: 'Se mostró la guía de emergencias y opción de derivación prioritaria.',
        variant: 'warning',
      },
    };
  }

  // Derivación prioritaria directa desde alerta de urgencia
  if (input === 'handoff:Recepción:urgencia') {
    const sysMsg = makeMsg(
      'sistema',
      'Sistema',
      'Derivación prioritaria a Recepción (Protocolo de urgencia). Bot pausado.',
      150,
    );
    const botMsg = makeMsg(
      'bot',
      BOT_NAME,
      'Derivamos tu conversación con prioridad a **Recepción** y pausamos el asistente automático. Recordá que ante una emergencia médica debés comunicarte con el **107** o acudir a la guardia.',
      300,
    );
    return {
      messages: [patientMsg, sysMsg, botMsg],
      nextSession: {
        ...session,
        flow: 'atencion_humana',
        step: 'handed_off',
        quickActions: [],
      },
      conversationPatch: {
        status: 'espera_humano',
        botEnabled: false,
        department: 'Recepción',
        assignedTo: undefined,
        tags: Array.from(new Set([...ctx.conversation.tags.filter((t) => t !== 'Bot activo'), 'Prioritario', 'Urgencia'])),
      },
      attachments,
      mutatedDomain: true,
    };
  }

  // 2) Bloqueo de diagnósticos, tratamientos o prescripciones
  if (isClinicalAdviceRequest(input)) {
    const botMsg = makeMsg('bot', BOT_NAME, buildClinicalScopeDisclaimer(), 300);
    const nextActions: ChatQuickAction[] = session.verified
      ? [
          { id: 'clin-turno', label: '📅 Solicitar turno', value: 'menu:turnos', variant: 'primary' },
          { id: 'clin-rx', label: '💊 Solicitar receta (revisión médica)', value: 'menu:recetas' },
          { id: 'clin-op', label: '🧑‍💼 Hablar con Recepción', value: 'menu:atencion_humana' },
          { id: 'clin-menu', label: 'Volver al menú', value: 'cmd:menu' },
        ]
      : [
          { id: 'clin-op', label: '🧑‍💼 Derivar a Recepción', value: 'handoff:Recepción' },
        ];
    return {
      messages: [patientMsg, botMsg],
      nextSession: { ...session, quickActions: nextActions },
      attachments,
    };
  }

  // Derivación directa a Recepción (disponible incluso antes de verificar)
  if (input === 'handoff:Recepción' || input === 'handoff:Turnos' || input === 'handoff:Documentación') {
    const dept = input.replace('handoff:', '') as WhatsAppConversation['department'];
    const sysMsg = makeMsg(
      'sistema',
      'Sistema',
      `Conversación derivada a atención humana · Área ${dept}. Bot pausado.`,
      150,
    );
    const botMsg = makeMsg(
      'bot',
      BOT_NAME,
      `Listo, derivamos tu conversación al equipo de **${dept}**.\nUn operador continuará la atención en breve. Mientras tanto, el asistente automático queda pausado.`,
      350,
    );
    return {
      messages: [patientMsg, sysMsg, botMsg],
      nextSession: {
        ...session,
        flow: 'atencion_humana',
        step: 'handed_off',
        quickActions: [],
      },
      conversationPatch: {
        status: 'espera_humano',
        botEnabled: false,
        department: dept,
        tags: Array.from(new Set([...ctx.conversation.tags.filter((t) => t !== 'Bot activo'), dept])),
      },
      attachments,
      mutatedDomain: true,
      toast: {
        title: `Derivada a ${dept}`,
        description: 'El bot fue pausado y la conversación pasó a espera de operador humano.',
        variant: 'info',
      },
    };
  }

  // ==================== FLUJO 1: BIENVENIDA Y VERIFICACIÓN ====================
  if (!session.verified) {
    const norm = normalizeText(input);

    if (session.step === 'ask_dni') {
      const digits = input.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 9) {
        const botMsg = makeMsg(
          'bot',
          BOT_NAME,
          'Para proteger tu información privada necesito verificar tu identidad primero.\nPor favor ingresá tu **DNI (7 u 8 dígitos, sin puntos)**, por ejemplo `30123456`.',
          300,
        );
        return {
          messages: [patientMsg, botMsg],
          nextSession: {
            ...session,
            quickActions: [
              { id: 'unver-handoff', label: '🧑‍💼 Hablar con Recepción', value: 'handoff:Recepción' },
            ],
          },
          attachments,
        };
      }

      const found = ctx.patients.find((p) => p.dni === digits);
      if (!found) {
        const botMsg = makeMsg(
          'bot',
          BOT_NAME,
          `No encontramos un paciente registrado con el DNI **${formatDNI(digits)}**.\nVerificá si lo escribiste correctamente o derivá tu consulta a Recepción para el alta administrativa.`,
          300,
        );
        return {
          messages: [patientMsg, botMsg],
          nextSession: {
            ...session,
            quickActions: [
              { id: 'dni-retry-handoff', label: '🧑‍💼 Derivar a Recepción', value: 'handoff:Recepción' },
            ],
          },
          attachments,
        };
      }

      // No revelamos nombre ni datos privados todavía!
      const botMsg = makeMsg(
        'bot',
        BOT_NAME,
        'Encontramos un registro asociado al DNI ingresado.\n\nPor seguridad, antes de mostrar cualquier información privada, necesito una **verificación adicional**:\nIndicame tu **fecha de nacimiento** (formato `DD/MM/AAAA`, ej. `14/05/1983`) o los **últimos 4 dígitos numéricos de tu N° de afiliado**.',
        300,
      );
      return {
        messages: [patientMsg, botMsg],
        nextSession: {
          ...session,
          step: 'verify_identity',
          pendingPatientId: found.id,
          verificationAttempts: 0,
          quickActions: [
            { id: 'ver-change-dni', label: '↩️ Ingresar otro DNI', value: 'cmd:restart_dni' },
            { id: 'ver-handoff', label: '🧑‍💼 Hablar con Recepción', value: 'handoff:Recepción' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'verify_identity') {
      if (input === 'cmd:restart_dni' || norm === 'cambiar dni') {
        const botMsg = makeMsg('bot', BOT_NAME, 'Perfecto, ingresá nuevamente tu **número de DNI** (sin puntos).', 250);
        return {
          messages: [patientMsg, botMsg],
          nextSession: {
            ...session,
            step: 'ask_dni',
            pendingPatientId: undefined,
            verificationAttempts: 0,
            quickActions: [],
          },
          attachments,
        };
      }

      const pendingPatient = ctx.patients.find((p) => p.id === session.pendingPatientId);
      if (!pendingPatient) {
        const botMsg = makeMsg('bot', BOT_NAME, 'Por favor ingresá nuevamente tu **número de DNI** (sin puntos).', 250);
        return {
          messages: [patientMsg, botMsg],
          nextSession: { ...session, step: 'ask_dni', pendingPatientId: undefined, quickActions: [] },
          attachments,
        };
      }

      if (!matchesSecondaryVerification(pendingPatient, input)) {
        const nextAttempts = session.verificationAttempts + 1;
        if (nextAttempts >= 3) {
          const sysMsg = makeMsg(
            'sistema',
            'Sistema',
            'Verificación de identidad fallida (3 intentos). Derivación automática a Recepción.',
            150,
          );
          const botMsg = makeMsg(
            'bot',
            BOT_NAME,
            'No pudimos validar tu identidad tras 3 intentos. Por seguridad no mostramos datos privados y derivamos la conversación a **Recepción** para ayudarte personalmente.',
            350,
          );
          return {
            messages: [patientMsg, sysMsg, botMsg],
            nextSession: {
              ...session,
              flow: 'atencion_humana',
              step: 'handed_off',
              verificationAttempts: nextAttempts,
              quickActions: [],
            },
            conversationPatch: {
              status: 'espera_humano',
              botEnabled: false,
              department: 'Recepción',
              tags: ['Validación manual'],
            },
            attachments,
          };
        }

        const botMsg = makeMsg(
          'bot',
          BOT_NAME,
          `El dato ingresado no coincide con nuestros registros (intento ${nextAttempts} de 3).\nIngresá tu **fecha de nacimiento** (\`DD/MM/AAAA\`) o los **últimos 4 dígitos de tu N° de afiliado**.`,
          300,
        );
        return {
          messages: [patientMsg, botMsg],
          nextSession: {
            ...session,
            verificationAttempts: nextAttempts,
            quickActions: [
              { id: 'ver-change-dni', label: '↩️ Ingresar otro DNI', value: 'cmd:restart_dni' },
              { id: 'ver-handoff', label: '🧑‍💼 Derivar a Recepción', value: 'handoff:Recepción' },
            ],
          },
          attachments,
        };
      }

      // ¡Verificación exitosa!
      const sysMsg = makeMsg(
        'sistema',
        'Sistema',
        `Identidad verificada correctamente (DNI ${formatDNI(pendingPatient.dni)}).`,
        150,
      );
      const botMsg = makeMsg(
        'bot',
        BOT_NAME,
        `¡Gracias, **${pendingPatient.firstName}**! Tu identidad fue verificada correctamente.\n\n¿En qué te puedo ayudar hoy? Elegí una opción del menú:`,
        350,
      );
      return {
        messages: [patientMsg, sysMsg, botMsg],
        nextSession: {
          ...session,
          verified: true,
          verifiedPatientId: pendingPatient.id,
          pendingPatientId: undefined,
          verificationAttempts: 0,
          flow: 'menu',
          step: 'idle',
          quickActions: buildMainMenuActions(),
        },
        conversationPatch: {
          patientId: pendingPatient.id,
          phone: pendingPatient.phone,
          tags: Array.from(new Set([...ctx.conversation.tags.filter((t) => t !== 'Verificación'), 'Verificado', 'Bot activo'])),
        },
        attachments,
        toast: {
          title: 'Identidad verificada',
          description: `Se desbloqueó la ficha de ${pendingPatient.firstName} ${pendingPatient.lastName}.`,
          variant: 'success',
        },
      };
    }
  }

  // A partir de aquí el paciente está verificado
  if (!patient) {
    const botMsg = makeMsg('bot', BOT_NAME, 'Necesito validar tu identidad nuevamente. Ingresá tu DNI sin puntos.', 250);
    return {
      messages: [patientMsg, botMsg],
      nextSession: {
        ...session,
        verified: false,
        flow: 'bienvenida',
        step: 'ask_dni',
        quickActions: [],
      },
      attachments,
    };
  }

  const norm = normalizeText(input);

  // Comando global para volver al menú
  if (input === 'cmd:menu' || norm === 'menu' || norm === 'inicio' || norm === 'volver al menu' || norm === '0') {
    const { botText, nextSession } = goToMenu(session, `¿En qué más te puedo ayudar, ${patient.firstName}?`);
    return {
      messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)],
      nextSession,
      attachments,
    };
  }

  // ==================== DISPATCH DESDE MENÚ PRINCIPAL ====================
  if (session.flow === 'menu' || input.startsWith('menu:')) {
    const choice = input.startsWith('menu:')
      ? input
      : norm === '1' || norm.includes('solicitar turno') || norm === 'turno' || norm === 'sacar turno'
        ? 'menu:turnos'
        : norm === '2' || norm.includes('mis turnos') || norm.includes('reprogramar') || norm.includes('cancelar')
          ? 'menu:gestion_turnos'
          : norm === '3' || norm.includes('receta') || norm.includes('medicacion')
            ? 'menu:recetas'
            : norm === '4' || norm.includes('document') || norm.includes('estudio') || norm.includes('derivacion') || norm.includes('informe')
              ? 'menu:documentacion'
              : norm === '5' || norm.includes('operador') || norm.includes('humano') || norm.includes('recepcion') || norm.includes('ayuda')
                ? 'menu:atencion_humana'
                : null;

    if (choice === 'menu:turnos') {
      const activeSpecialties = ctx.specialties.filter(
        (s) => s.active && ctx.doctors.some((d) => d.active && d.specialtyIds.includes(s.id)),
      );
      const actions: ChatQuickAction[] = [
        ...activeSpecialties.map((s) => ({
          id: `esp-${s.id}`,
          label: s.name,
          value: `esp:${s.id}`,
        })),
        { id: 'back-menu', label: '↩️ Menú principal', value: 'cmd:menu' },
      ];
      return {
        messages: [
          patientMsg,
          makeMsg('bot', BOT_NAME, '📅 **Solicitud de turno**\n\nSeleccioná la **especialidad** que necesitás:', 280),
        ],
        nextSession: {
          ...session,
          flow: 'turnos',
          step: 'select_specialty',
          booking: {},
          quickActions: actions,
        },
        attachments,
      };
    }

    if (choice === 'menu:gestion_turnos') {
      const nowMs = Date.now();
      const patientApts = ctx.appointments
        .filter(
          (a) =>
            a.patientId === patient.id &&
            ['pendiente', 'confirmado', 'reprogramado'].includes(a.status) &&
            new Date(a.startAt).getTime() >= nowMs - 12 * 60 * 60 * 1000,
        )
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      if (patientApts.length === 0) {
        return {
          messages: [
            patientMsg,
            makeMsg(
              'bot',
              BOT_NAME,
              '🗓️ **Mis turnos**\n\nNo tenés turnos próximos activos en este momento. ¿Querés solicitar uno nuevo?',
              280,
            ),
          ],
          nextSession: {
            ...session,
            flow: 'menu',
            step: 'idle',
            quickActions: [
              { id: 'new-apt', label: '📅 Solicitar turno', value: 'menu:turnos', variant: 'primary' },
              { id: 'back-menu', label: '↩️ Menú principal', value: 'cmd:menu' },
            ],
          },
          attachments,
        };
      }

      const lines = patientApts.map((apt, idx) => {
        const doc = ctx.doctors.find((d) => d.id === apt.doctorId);
        const esp = ctx.specialties.find((s) => s.id === apt.specialtyId);
        const statusLabel = APPOINTMENT_STATUS_META[apt.status].label;
        return `${idx + 1}. **${formatDate(apt.startAt)} · ${formatTime(apt.startAt)} hs** — ${esp?.name ?? 'Consulta'} (${doc ? `${doc.title} ${doc.lastName}` : 'Profesional'}) · _${statusLabel}_`;
      });

      const actions: ChatQuickAction[] = [
        ...patientApts.map((apt) => {
          const doc = ctx.doctors.find((d) => d.id === apt.doctorId);
          return {
            id: `apt-${apt.id}`,
            label: `${formatDate(apt.startAt).slice(0, 5)} ${formatTime(apt.startAt)} · ${doc ? doc.lastName : 'Turno'}`,
            value: `apt:${apt.id}`,
          };
        }),
        { id: 'back-menu', label: '↩️ Menú principal', value: 'cmd:menu' },
      ];

      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            `🗓️ **Tus próximos turnos**\n\n${lines.join('\n')}\n\nSeleccioná un turno para confirmar asistencia, reprogramar o cancelar:`,
            280,
          ),
        ],
        nextSession: {
          ...session,
          flow: 'gestion_turnos',
          step: 'select_appointment',
          manage: {},
          quickActions: actions,
        },
        attachments,
      };
    }

    if (choice === 'menu:recetas') {
      const cov = ctx.coverages.find((c) => c.id === patient.coverage.coverageId);
      const covLabel = cov ? `${cov.name}${patient.coverage.plan ? ` (${patient.coverage.plan})` : ''}` : 'Particular';
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            `💊 **Solicitud de receta (para revisión médica)**\n\n_Importante: esta solicitud no constituye prescripción automática; será revisada por el equipo médico._\n\nPaso 1 de 7 — Confirmá tu **obra social / cobertura**:\nRegistrada: **${covLabel}**`,
            280,
          ),
        ],
        nextSession: {
          ...session,
          flow: 'recetas',
          step: 'rx_coverage',
          prescription: {},
          quickActions: [
            { id: 'rx-cov-ok', label: `Confirmar: ${cov?.name ?? 'Particular'}`, value: `rxcov:${covLabel}`, variant: 'primary' },
            { id: 'back-menu', label: 'Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (choice === 'menu:documentacion') {
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            '📄 **Envío y clasificación de documentación**\n\n¿Qué tipo de documento necesitás enviarnos?',
            280,
          ),
        ],
        nextSession: {
          ...session,
          flow: 'documentacion',
          step: 'doc_category',
          document: {},
          quickActions: [
            { id: 'doc-der', label: '📋 Derivación', value: 'doctype:Derivación' },
            { id: 'doc-est', label: '🧪 Estudio', value: 'doctype:Estudio' },
            { id: 'doc-rec', label: '💊 Receta', value: 'doctype:Receta' },
            { id: 'doc-inf', label: '📑 Informe', value: 'doctype:Informe' },
            { id: 'back-menu', label: '↩️ Menú principal', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (choice === 'menu:atencion_humana') {
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            '🧑‍💼 **Derivación a atención humana**\n\nSeleccioná el área con la que deseás comunicarte:',
            280,
          ),
        ],
        nextSession: {
          ...session,
          flow: 'atencion_humana',
          step: 'select_department',
          quickActions: [
            { id: 'dept-rec', label: 'Recepción general', value: 'handoff:Recepción', variant: 'primary' },
            { id: 'dept-tur', label: 'Área de Turnos', value: 'handoff:Turnos' },
            { id: 'dept-doc', label: 'Área de Documentación', value: 'handoff:Documentación' },
            { id: 'back-menu', label: '↩️ Menú principal', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    // Mensaje libre no reconocido en menú
    return {
      messages: [
        patientMsg,
        makeMsg(
          'bot',
          BOT_NAME,
          `Hola ${patient.firstName}. Elegí una opción del menú para continuar (o escribí "turno", "mis turnos", "receta", "documentación" u "operador"):`,
          250,
        ),
      ],
      nextSession: { ...session, flow: 'menu', step: 'idle', quickActions: buildMainMenuActions() },
      attachments,
    };
  }

  // ==================== FLUJO 2: SOLICITUD DE TURNOS ====================
  if (session.flow === 'turnos') {
    if (session.step === 'select_specialty') {
      const selectedEsp = input.startsWith('esp:')
        ? ctx.specialties.find((s) => s.id === input.slice(4))
        : ctx.specialties.find((s) => s.active && normalizeText(s.name).includes(norm));

      if (!selectedEsp) {
        return {
          messages: [patientMsg, makeMsg('bot', BOT_NAME, 'No reconocí esa especialidad. Seleccioná una de las opciones:', 250)],
          nextSession: session,
          attachments,
        };
      }

      const docs = ctx.doctors.filter((d) => d.active && d.specialtyIds.includes(selectedEsp.id));
      const actions: ChatQuickAction[] = [
        ...docs.map((d) => {
          const site = ctx.sites.find((s) => s.id === d.siteId);
          return {
            id: `doc-${d.id}`,
            label: `${d.title} ${d.firstName} ${d.lastName}${site ? ` (${site.name.replace('Sede ', '')})` : ''}`,
            value: `doc:${d.id}`,
          };
        }),
        { id: 'back-menu', label: '↩️ Cancelar', value: 'cmd:menu' },
      ];

      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            `Especialidad elegida: **${selectedEsp.name}**.\n\nElegí el **profesional** con quien deseás atenderte:`,
            280,
          ),
        ],
        nextSession: {
          ...session,
          step: 'select_doctor',
          booking: { specialtyId: selectedEsp.id },
          quickActions: actions,
        },
        attachments,
      };
    }

    if (session.step === 'select_doctor') {
      const selectedDoc = input.startsWith('doc:')
        ? ctx.doctors.find((d) => d.id === input.slice(4))
        : ctx.doctors.find(
            (d) =>
              d.active &&
              d.specialtyIds.includes(session.booking.specialtyId ?? '') &&
              normalizeText(`${d.firstName} ${d.lastName}`).includes(norm),
          );

      if (!selectedDoc) {
        return {
          messages: [patientMsg, makeMsg('bot', BOT_NAME, 'Seleccioná un profesional de la lista:', 250)],
          nextSession: session,
          attachments,
        };
      }

      const availDates = getDoctorAvailableDates(selectedDoc, ctx.appointments, ctx.blocks);
      if (availDates.length === 0) {
        return {
          messages: [
            patientMsg,
            makeMsg(
              'bot',
              BOT_NAME,
              `${selectedDoc.title} ${selectedDoc.lastName} no tiene horarios disponibles en los próximos 14 días. ¿Querés hablar con Turnos para lista de espera?`,
              280,
            ),
          ],
          nextSession: {
            ...session,
            quickActions: [
              { id: 'waitlist-handoff', label: '🧑‍💼 Derivar a Turnos', value: 'handoff:Turnos', variant: 'primary' },
              { id: 'back-menu', label: '↩️ Menú principal', value: 'cmd:menu' },
            ],
          },
          attachments,
        };
      }

      const actions: ChatQuickAction[] = [
        ...availDates.map((d) => ({
          id: `date-${d.dateKey}`,
          label: `${d.label} (${d.slots.length} disp.)`,
          value: `date:${d.dateKey}`,
        })),
        { id: 'back-menu', label: '↩️ Cancelar', value: 'cmd:menu' },
      ];

      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            `Consultando disponibilidad real de **${selectedDoc.title} ${selectedDoc.firstName} ${selectedDoc.lastName}**...\n\nElegí una **fecha disponible**:`,
            300,
          ),
        ],
        nextSession: {
          ...session,
          step: 'select_date',
          booking: { ...session.booking, doctorId: selectedDoc.id },
          quickActions: actions,
        },
        attachments,
      };
    }

    if (session.step === 'select_date') {
      const doctor = ctx.doctors.find((d) => d.id === session.booking.doctorId);
      if (!doctor) return { messages: [patientMsg], nextSession: session, attachments };

      const availDates = getDoctorAvailableDates(doctor, ctx.appointments, ctx.blocks);
      const chosen = input.startsWith('date:')
        ? availDates.find((d) => d.dateKey === input.slice(5))
        : availDates.find((d) => normalizeText(d.label).includes(norm) || d.dateKey === input);

      if (!chosen) {
        return {
          messages: [patientMsg, makeMsg('bot', BOT_NAME, 'Elegí una de las fechas disponibles:', 250)],
          nextSession: session,
          attachments,
        };
      }

      const slotsToShow = chosen.slots.slice(0, 8);
      const actions: ChatQuickAction[] = [
        ...slotsToShow.map((slot) => ({
          id: `time-${slot}`,
          label: `${slot} hs`,
          value: `time:${slot}`,
        })),
        { id: 'back-menu', label: '↩️ Cancelar', value: 'cmd:menu' },
      ];

      return {
        messages: [
          patientMsg,
          makeMsg('bot', BOT_NAME, `Horarios disponibles para el **${chosen.label}**:\nSeleccioná tu **horario**:`, 280),
        ],
        nextSession: {
          ...session,
          step: 'select_time',
          booking: { ...session.booking, dateKey: chosen.dateKey },
          quickActions: actions,
        },
        attachments,
      };
    }

    if (session.step === 'select_time') {
      const time = input.startsWith('time:') ? input.slice(5) : input.replace(/\s*hs$/i, '').trim();
      if (!/^\d{2}:\d{2}$/.test(time)) {
        return {
          messages: [patientMsg, makeMsg('bot', BOT_NAME, 'Seleccioná un horario disponible de las opciones:', 250)],
          nextSession: session,
          attachments,
        };
      }

      return {
        messages: [
          patientMsg,
          makeMsg('bot', BOT_NAME, `Horario seleccionado: **${time} hs**.\n\nIndicá el **motivo / tipo de turno**:`, 250),
        ],
        nextSession: {
          ...session,
          step: 'select_type',
          booking: { ...session.booking, time },
          quickActions: [
            { id: 'type-control', label: 'Control', value: 'apttype:control' },
            { id: 'type-primera', label: 'Primera vez', value: 'apttype:primera_vez' },
            { id: 'type-trat', label: 'Tratamiento', value: 'apttype:tratamiento' },
            { id: 'type-est', label: 'Estudio', value: 'apttype:estudio' },
            { id: 'back-menu', label: '↩️ Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'select_type') {
      const typeMap: Record<string, AppointmentType> = {
        control: 'control',
        primera_vez: 'primera_vez',
        tratamiento: 'tratamiento',
        estudio: 'estudio',
      };
      const key = input.startsWith('apttype:') ? input.slice(8) : norm.replace(/\s+/g, '_');
      const aptType = typeMap[key] ?? 'control';

      const esp = ctx.specialties.find((s) => s.id === session.booking.specialtyId);
      const doc = ctx.doctors.find((d) => d.id === session.booking.doctorId);
      const site = ctx.sites.find((s) => s.id === doc?.siteId);
      const cov = ctx.coverages.find((c) => c.id === patient.coverage.coverageId);
      const formattedDate = session.booking.dateKey ? formatDate(`${session.booking.dateKey}T12:00:00`) : '';

      const summary = [
        '📋 **Resumen del turno a confirmar**',
        '',
        `• **Paciente:** ${patient.firstName} ${patient.lastName} (DNI ${formatDNI(patient.dni)})`,
        `• **Especialidad:** ${esp?.name ?? ''}`,
        `• **Profesional:** ${doc ? `${doc.title} ${doc.firstName} ${doc.lastName}` : ''}`,
        `• **Sede:** ${site?.name ?? 'Sede Central'}`,
        `• **Fecha y hora:** ${formattedDate} a las ${session.booking.time} hs`,
        `• **Tipo:** ${APPOINTMENT_TYPE_LABELS[aptType]}`,
        `• **Cobertura:** ${cov?.name ?? 'Particular'}`,
        '',
        '¿Confirmás la reserva del turno?',
      ].join('\n');

      return {
        messages: [patientMsg, makeMsg('bot', BOT_NAME, summary, 280)],
        nextSession: {
          ...session,
          step: 'confirm_booking',
          booking: { ...session.booking, type: aptType },
          quickActions: [
            { id: 'confirm-yes', label: '✅ Confirmar turno', value: 'confirm:yes', variant: 'primary' },
            { id: 'confirm-no', label: '❌ Cancelar', value: 'cmd:menu', variant: 'danger' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'confirm_booking') {
      if (input === 'confirm:yes' || norm === 'si' || norm === 'confirmar') {
        const { specialtyId, doctorId, dateKey, time, type } = session.booking;
        if (!specialtyId || !doctorId || !dateKey || !time) {
          const { botText, nextSession } = goToMenu(session, 'Faltaron datos del turno. Volvemos al menú.');
          return { messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)], nextSession, attachments };
        }

        const esp = ctx.specialties.find((s) => s.id === specialtyId);
        const doc = ctx.doctors.find((d) => d.id === doctorId);
        const duration = esp?.defaultDurationMinutes ?? 20;
        const startAt = combineDateAndTime(dateKey, time);
        const endAt = combineDateAndTime(dateKey, addMinutesToTime(time, duration));

        const created = await appointmentsService.create({
          patientId: patient.id,
          doctorId,
          specialtyId,
          startAt,
          endAt,
          status: 'confirmado',
          type: type ?? 'control',
          channel: 'whatsapp',
          notes: 'Turno reservado por autogestión vía Chatbot WhatsApp.',
        });

        await notificationsService.sendManual({
          category: 'confirmacion',
          channel: 'whatsapp',
          patientId: patient.id,
          recipient: patient.phone,
          subject: `Confirmación de turno · ${esp?.name ?? 'Consulta'}`,
          message: `Turno confirmado para el ${formatDate(startAt)} a las ${time} hs con ${doc ? `${doc.title} ${doc.lastName}` : 'profesional'}.`,
          appointmentId: created.id,
        });

        await patientHistoryService.addEntry({
          patientId: patient.id,
          date: new Date().toISOString(),
          category: 'administrativo',
          title: 'Turno agendado por WhatsApp',
          description: `${esp?.name ?? 'Consulta'} con ${doc ? `${doc.title} ${doc.lastName}` : 'profesional'} el ${formatDate(startAt)} a las ${time} hs.`,
          doctorId,
        });

        doctorPortalService.pushNotification({
          doctorId,
          category: 'turno',
          patientId: patient.id,
          title: 'Nuevo turno agendado por WhatsApp',
          message: `${patient.firstName} ${patient.lastName} reservó un turno para el ${formatDate(startAt)} a las ${time} hs.`,
          type: 'info',
          link: '/medico/agenda',
        });

        const { nextSession } = goToMenu(session, '');
        const botMsg = makeMsg(
          'bot',
          BOT_NAME,
          `✅ **¡Turno registrado con éxito!** (Ref. \`${created.id}\`)\n\nTe esperamos el **${formatDate(startAt)} a las ${time} hs** con **${doc ? `${doc.title} ${doc.firstName} ${doc.lastName}` : 'tu profesional'}**.\nRecordá presentar DNI, credencial vigente y estudios previos.\n\n¿Necesitás realizar otra gestión?`,
          320,
        );

        return {
          messages: [patientMsg, botMsg],
          nextSession,
          attachments,
          mutatedDomain: true,
          toast: {
            title: 'Turno registrado en agenda',
            description: `Se creó el turno ${created.id} y ya es visible en los paneles administrativo y médico.`,
            variant: 'success',
          },
        };
      }

      const { botText, nextSession } = goToMenu(session, 'Reserva cancelada. ¿En qué más te puedo ayudar?');
      return { messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)], nextSession, attachments };
    }
  }

  // ==================== FLUJO 3: GESTIÓN DE TURNOS ====================
  if (session.flow === 'gestion_turnos') {
    if (session.step === 'select_appointment') {
      const aptId = input.startsWith('apt:') ? input.slice(4) : '';
      const apt = ctx.appointments.find((a) => a.id === aptId && a.patientId === patient.id);
      if (!apt) {
        return {
          messages: [patientMsg, makeMsg('bot', BOT_NAME, 'Seleccioná uno de tus turnos de la lista:', 250)],
          nextSession: session,
          attachments,
        };
      }

      const doc = ctx.doctors.find((d) => d.id === apt.doctorId);
      const esp = ctx.specialties.find((s) => s.id === apt.specialtyId);
      const statusLabel = APPOINTMENT_STATUS_META[apt.status].label;

      const actions: ChatQuickAction[] = [
        ...(apt.status !== 'confirmado'
          ? [{ id: 'act-confirm', label: '✅ Confirmar asistencia', value: 'aptact:confirmar', variant: 'primary' as const }]
          : []),
        { id: 'act-resched', label: '🔄 Reprogramar turno', value: 'aptact:reprogramar' },
        { id: 'act-cancel', label: '❌ Cancelar turno', value: 'aptact:cancelar', variant: 'danger' },
        { id: 'back-menu', label: '↩️ Menú principal', value: 'cmd:menu' },
      ];

      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            `📌 **Turno seleccionado**\n• **Fecha:** ${formatDate(apt.startAt)} a las ${formatTime(apt.startAt)} hs\n• **Especialidad:** ${esp?.name ?? 'Consulta'}\n• **Profesional:** ${doc ? `${doc.title} ${doc.firstName} ${doc.lastName}` : ''}\n• **Estado actual:** ${statusLabel}\n\n¿Qué gestión deseás realizar?`,
            280,
          ),
        ],
        nextSession: {
          ...session,
          step: 'select_action',
          manage: { appointmentId: apt.id },
          quickActions: actions,
        },
        attachments,
      };
    }

    if (session.step === 'select_action') {
      const apt = ctx.appointments.find((a) => a.id === session.manage.appointmentId);
      if (!apt) {
        const { botText, nextSession } = goToMenu(session, 'No se encontró el turno seleccionado.');
        return { messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)], nextSession, attachments };
      }

      if (input === 'aptact:confirmar' || norm.includes('confirm')) {
        await appointmentsService.updateStatus(apt.id, 'confirmado', 'Asistencia confirmada por el paciente vía WhatsApp.');
        await notificationsService.sendManual({
          category: 'confirmacion',
          channel: 'whatsapp',
          patientId: patient.id,
          recipient: patient.phone,
          subject: 'Asistencia confirmada por WhatsApp',
          message: `El paciente confirmó asistencia para el turno del ${formatDate(apt.startAt)} ${formatTime(apt.startAt)} hs.`,
          appointmentId: apt.id,
        });
        const { nextSession } = goToMenu(session, '');
        return {
          messages: [
            patientMsg,
            makeMsg(
              'bot',
              BOT_NAME,
              `✅ **¡Asistencia confirmada!**\nTu turno del **${formatDate(apt.startAt)} a las ${formatTime(apt.startAt)} hs** quedó confirmado en agenda.\n\n¿Necesitás algo más?`,
              280,
            ),
          ],
          nextSession,
          attachments,
          mutatedDomain: true,
          toast: {
            title: 'Asistencia confirmada',
            description: `Turno ${apt.id} actualizado a Confirmado.`,
            variant: 'success',
          },
        };
      }

      if (input === 'aptact:cancelar' || norm.includes('cancel')) {
        return {
          messages: [
            patientMsg,
            makeMsg(
              'bot',
              BOT_NAME,
              `¿Confirmás que deseás **cancelar** tu turno del **${formatDate(apt.startAt)} a las ${formatTime(apt.startAt)} hs**?`,
              250,
            ),
          ],
          nextSession: {
            ...session,
            step: 'confirm_cancel',
            quickActions: [
              { id: 'cancel-yes', label: 'Sí, cancelar turno', value: 'cancel:yes', variant: 'danger' },
              { id: 'cancel-no', label: 'No, mantener turno', value: 'cmd:menu' },
            ],
          },
          attachments,
        };
      }

      if (input === 'aptact:reprogramar' || norm.includes('reprogram')) {
        const doc = ctx.doctors.find((d) => d.id === apt.doctorId);
        if (!doc) {
          const { botText, nextSession } = goToMenu(session, 'No pudimos consultar la agenda del profesional.');
          return { messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)], nextSession, attachments };
        }
        const availDates = getDoctorAvailableDates(doc, ctx.appointments, ctx.blocks);
        if (availDates.length === 0) {
          return {
            messages: [
              patientMsg,
              makeMsg('bot', BOT_NAME, 'No hay fechas próximas automáticas para reprogramar. ¿Querés derivar a Turnos?', 280),
            ],
            nextSession: {
              ...session,
              quickActions: [
                { id: 'res-handoff', label: '🧑‍💼 Derivar a Turnos', value: 'handoff:Turnos', variant: 'primary' },
                { id: 'back-menu', label: '↩️ Menú principal', value: 'cmd:menu' },
              ],
            },
            attachments,
          };
        }

        return {
          messages: [
            patientMsg,
            makeMsg(
              'bot',
              BOT_NAME,
              `🔄 **Reprogramación de turno**\nElegí una nueva **fecha disponible** con ${doc.title} ${doc.lastName}:`,
              280,
            ),
          ],
          nextSession: {
            ...session,
            step: 'reschedule_date',
            quickActions: [
              ...availDates.map((d) => ({
                id: `rdate-${d.dateKey}`,
                label: `${d.label} (${d.slots.length} disp.)`,
                value: `rdate:${d.dateKey}`,
              })),
              { id: 'back-menu', label: '↩️ Cancelar', value: 'cmd:menu' },
            ],
          },
          attachments,
        };
      }
    }

    if (session.step === 'confirm_cancel') {
      const apt = ctx.appointments.find((a) => a.id === session.manage.appointmentId);
      if (apt && (input === 'cancel:yes' || norm === 'si')) {
        await appointmentsService.updateStatus(apt.id, 'cancelado', 'Cancelado por el paciente vía Chatbot WhatsApp.');
        await notificationsService.sendManual({
          category: 'cancelacion',
          channel: 'whatsapp',
          patientId: patient.id,
          recipient: patient.phone,
          subject: 'Turno cancelado por WhatsApp',
          message: `Se canceló el turno del ${formatDate(apt.startAt)} ${formatTime(apt.startAt)} hs.`,
          appointmentId: apt.id,
        });
        await patientHistoryService.addEntry({
          patientId: patient.id,
          date: new Date().toISOString(),
          category: 'administrativo',
          title: 'Turno cancelado por WhatsApp',
          description: `El paciente canceló su turno del ${formatDate(apt.startAt)} a las ${formatTime(apt.startAt)} hs.`,
          doctorId: apt.doctorId,
        });
        doctorPortalService.pushNotification({
          doctorId: apt.doctorId,
          category: 'turno',
          patientId: patient.id,
          title: 'Turno cancelado por WhatsApp',
          message: `${patient.firstName} ${patient.lastName} canceló su turno del ${formatDate(apt.startAt)} a las ${formatTime(apt.startAt)} hs.`,
          type: 'warning',
          link: '/medico/agenda',
        });
        const { nextSession } = goToMenu(session, '');
        return {
          messages: [
            patientMsg,
            makeMsg(
              'bot',
              BOT_NAME,
              `Tu turno del **${formatDate(apt.startAt)} a las ${formatTime(apt.startAt)} hs** fue **cancelado**.\nSi más adelante necesitás reagendar, podés solicitar un nuevo turno desde el menú.`,
              280,
            ),
          ],
          nextSession,
          attachments,
          mutatedDomain: true,
          toast: {
            title: 'Turno cancelado',
            description: `El turno ${apt.id} fue marcado como Cancelado en la agenda.`,
            variant: 'info',
          },
        };
      }
      const { botText, nextSession } = goToMenu(session, 'Perfecto, tu turno sigue vigente. ¿En qué más te ayudo?');
      return { messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)], nextSession, attachments };
    }

    if (session.step === 'reschedule_date') {
      const apt = ctx.appointments.find((a) => a.id === session.manage.appointmentId);
      const doc = apt ? ctx.doctors.find((d) => d.id === apt.doctorId) : undefined;
      if (!apt || !doc) {
        const { botText, nextSession } = goToMenu(session, 'Volvemos al menú principal.');
        return { messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)], nextSession, attachments };
      }

      const availDates = getDoctorAvailableDates(doc, ctx.appointments, ctx.blocks);
      const chosen = input.startsWith('rdate:')
        ? availDates.find((d) => d.dateKey === input.slice(6))
        : availDates.find((d) => normalizeText(d.label).includes(norm));

      if (!chosen) {
        return {
          messages: [patientMsg, makeMsg('bot', BOT_NAME, 'Seleccioná una de las fechas disponibles:', 250)],
          nextSession: session,
          attachments,
        };
      }

      return {
        messages: [
          patientMsg,
          makeMsg('bot', BOT_NAME, `Seleccioná el nuevo **horario** para el **${chosen.label}**:`, 250),
        ],
        nextSession: {
          ...session,
          step: 'reschedule_time',
          manage: { ...session.manage, newDateKey: chosen.dateKey },
          quickActions: [
            ...chosen.slots.slice(0, 8).map((slot) => ({
              id: `rtime-${slot}`,
              label: `${slot} hs`,
              value: `rtime:${slot}`,
            })),
            { id: 'back-menu', label: '↩️ Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'reschedule_time') {
      const time = input.startsWith('rtime:') ? input.slice(6) : input.replace(/\s*hs$/i, '').trim();
      if (!/^\d{2}:\d{2}$/.test(time)) {
        return {
          messages: [patientMsg, makeMsg('bot', BOT_NAME, 'Seleccioná un horario disponible de las opciones:', 250)],
          nextSession: session,
          attachments,
        };
      }

      const formattedDate = session.manage.newDateKey ? formatDate(`${session.manage.newDateKey}T12:00:00`) : '';
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            `¿Confirmás reprogramar tu turno al **${formattedDate} a las ${time} hs**?`,
            250,
          ),
        ],
        nextSession: {
          ...session,
          step: 'confirm_reschedule',
          manage: { ...session.manage, newTime: time },
          quickActions: [
            { id: 'res-yes', label: '✅ Confirmar reprogramación', value: 'resched:yes', variant: 'primary' },
            { id: 'res-no', label: '❌ Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'confirm_reschedule') {
      const apt = ctx.appointments.find((a) => a.id === session.manage.appointmentId);
      if (apt && session.manage.newDateKey && session.manage.newTime && (input === 'resched:yes' || norm === 'si')) {
        const esp = ctx.specialties.find((s) => s.id === apt.specialtyId);
        const duration = esp?.defaultDurationMinutes ?? 20;
        const startAt = combineDateAndTime(session.manage.newDateKey, session.manage.newTime);
        const endAt = combineDateAndTime(session.manage.newDateKey, addMinutesToTime(session.manage.newTime, duration));

        await appointmentsService.reschedule(
          apt.id,
          startAt,
          endAt,
          'Reprogramado por el paciente vía Chatbot WhatsApp.',
        );
        await notificationsService.sendManual({
          category: 'reprogramacion',
          channel: 'whatsapp',
          patientId: patient.id,
          recipient: patient.phone,
          subject: 'Turno reprogramado por WhatsApp',
          message: `Tu turno fue reprogramado al ${formatDate(startAt)} a las ${session.manage.newTime} hs.`,
          appointmentId: apt.id,
        });
        await patientHistoryService.addEntry({
          patientId: patient.id,
          date: new Date().toISOString(),
          category: 'administrativo',
          title: 'Turno reprogramado por WhatsApp',
          description: `Reprogramado al ${formatDate(startAt)} a las ${session.manage.newTime} hs.`,
          doctorId: apt.doctorId,
        });
        doctorPortalService.pushNotification({
          doctorId: apt.doctorId,
          category: 'turno',
          patientId: patient.id,
          title: 'Turno reprogramado por WhatsApp',
          message: `${patient.firstName} ${patient.lastName} reprogramó su turno al ${formatDate(startAt)} a las ${session.manage.newTime} hs.`,
          type: 'info',
          link: '/medico/agenda',
        });

        const { nextSession } = goToMenu(session, '');
        return {
          messages: [
            patientMsg,
            makeMsg(
              'bot',
              BOT_NAME,
              `✅ **¡Turno reprogramado!**\nNueva fecha: **${formatDate(startAt)} a las ${session.manage.newTime} hs**.\n\n¿En qué más te puedo ayudar?`,
              280,
            ),
          ],
          nextSession,
          attachments,
          mutatedDomain: true,
          toast: {
            title: 'Turno reprogramado',
            description: `Nuevo horario: ${formatDate(startAt)} ${session.manage.newTime} hs.`,
            variant: 'success',
          },
        };
      }
      const { botText, nextSession } = goToMenu(session, 'Reprogramación cancelada. ¿En qué más te ayudo?');
      return { messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)], nextSession, attachments };
    }
  }

  // ==================== FLUJO 4: RECETAS ====================
  if (session.flow === 'recetas') {
    if (session.step === 'rx_coverage') {
      const coverageName = input.startsWith('rxcov:') ? input.slice(6) : input;
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            `Paso 2 de 7 — Confirmá o ingresá tu **número de afiliado**:\nRegistrado: **${patient.coverage.affiliateNumber}**`,
            250,
          ),
        ],
        nextSession: {
          ...session,
          step: 'rx_affiliate',
          prescription: { ...session.prescription, coverageName },
          quickActions: [
            {
              id: 'rx-aff-ok',
              label: `Confirmar: ${patient.coverage.affiliateNumber}`,
              value: `rxaff:${patient.coverage.affiliateNumber}`,
              variant: 'primary',
            },
            { id: 'back-menu', label: 'Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'rx_affiliate') {
      const affiliateNumber = input.startsWith('rxaff:') ? input.slice(6) : input;
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            'Paso 3 de 7 — Escribí el **medicamento** que declarás necesitar renovar (o elegí un ejemplo ficticio para la demo):',
            250,
          ),
        ],
        nextSession: {
          ...session,
          step: 'rx_medication',
          prescription: { ...session.prescription, affiliateNumber },
          quickActions: [
            { id: 'rx-med-1', label: 'Ondansetrón', value: 'Ondansetrón' },
            { id: 'rx-med-2', label: 'Tamoxifeno', value: 'Tamoxifeno' },
            { id: 'rx-med-3', label: 'Anastrozol', value: 'Anastrozol' },
            { id: 'back-menu', label: 'Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'rx_medication') {
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            `Medicamento declarado: **${input}**.\n\nPaso 4 de 7 — Indicá la **dosis declarada** (ej. \`8 mg\`, \`20 mg\`, \`1 mg\`):`,
            250,
          ),
        ],
        nextSession: {
          ...session,
          step: 'rx_dose',
          prescription: { ...session.prescription, declaredMedication: input },
          quickActions: [
            { id: 'rx-dose-1', label: '8 mg', value: '8 mg' },
            { id: 'rx-dose-2', label: '20 mg', value: '20 mg' },
            { id: 'rx-dose-3', label: '1 mg', value: '1 mg' },
            { id: 'back-menu', label: 'Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'rx_dose') {
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            'Paso 5 de 7 — Indicá la **frecuencia** habitual según tu última indicación médica:',
            250,
          ),
        ],
        nextSession: {
          ...session,
          step: 'rx_frequency',
          prescription: { ...session.prescription, dose: input },
          quickActions: [
            { id: 'rx-freq-1', label: '1 vez por día', value: '1 vez por día' },
            { id: 'rx-freq-2', label: 'Cada 12 horas', value: 'Cada 12 horas' },
            { id: 'rx-freq-3', label: 'Según esquema del ciclo', value: 'Según esquema del ciclo' },
            { id: 'back-menu', label: 'Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'rx_frequency') {
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            'Paso 6 de 7 — ¿Cuál es el **motivo** de la solicitud?',
            250,
          ),
        ],
        nextSession: {
          ...session,
          step: 'rx_reason',
          prescription: { ...session.prescription, frequency: input },
          quickActions: [
            { id: 'rx-rea-1', label: 'Renovación mensual', value: 'Renovación mensual de tratamiento' },
            { id: 'rx-rea-2', label: 'Continuidad de ciclo', value: 'Continuidad de esquema oncológico' },
            { id: 'rx-rea-3', label: 'Requerimiento de cobertura', value: 'Actualización de receta para cobertura' },
            { id: 'back-menu', label: 'Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'rx_reason') {
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            'Paso 7 de 7 — **Receta anterior**: podés adjuntar una foto/PDF simulado de tu receta previa o indicar si no disponés de ella:',
            250,
          ),
        ],
        nextSession: {
          ...session,
          step: 'rx_previous',
          prescription: { ...session.prescription, reason: input },
          quickActions: [
            { id: 'rx-prev-pdf', label: '📎 Adjuntar receta anterior (PDF)', value: 'rxprev:pdf', variant: 'primary' },
            { id: 'rx-prev-img', label: '🖼️ Adjuntar foto de receta', value: 'rxprev:imagen' },
            { id: 'rx-prev-none', label: 'No tengo receta anterior', value: 'rxprev:ninguna' },
            { id: 'back-menu', label: 'Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'rx_previous') {
      let prevFile: ChatAttachment | undefined = options?.attachment;
      let prevNote = input;

      if (input === 'rxprev:pdf') {
        prevFile = {
          name: `Receta_Anterior_${patient.lastName}.pdf`,
          fileType: 'pdf',
          sizeKb: 340,
          categoryLabel: 'Receta anterior',
        };
        prevNote = 'Adjunto PDF de receta anterior';
        attachments[patientMsg.id] = prevFile;
      } else if (input === 'rxprev:imagen') {
        prevFile = {
          name: `Foto_Receta_${patient.lastName}.jpg`,
          fileType: 'imagen',
          sizeKb: 520,
          categoryLabel: 'Receta anterior',
        };
        prevNote = 'Adjunto imagen de receta anterior';
        attachments[patientMsg.id] = prevFile;
      } else if (input === 'rxprev:ninguna') {
        prevNote = 'Sin receta anterior adjunta';
      } else if (prevFile) {
        prevNote = `Adjunto: ${prevFile.name}`;
      }

      const rx = {
        ...session.prescription,
        previousPrescriptionFile: prevFile,
        previousPrescriptionNote: prevNote,
      };

      const assignedDoc = ctx.doctors.find((d) => d.id === patient.assignedDoctorId);

      const summary = [
        '💊 **Resumen de solicitud de receta**',
        '',
        `• **Cobertura:** ${rx.coverageName} · Afiliado: ${rx.affiliateNumber}`,
        `• **Medicamento declarado:** ${rx.declaredMedication}`,
        `• **Dosis y frecuencia:** ${rx.dose} · ${rx.frequency}`,
        `• **Motivo:** ${rx.reason}`,
        `• **Receta anterior:** ${prevFile ? `${prevFile.name} (${prevFile.sizeKb} KB)` : prevNote}`,
        `• **Profesional asignado:** ${assignedDoc ? `${assignedDoc.title} ${assignedDoc.lastName}` : 'Equipo médico'}`,
        '',
        '_Esta solicitud quedará pendiente de revisión médica. ¿Confirmás el envío?_',
      ].join('\n');

      return {
        messages: [patientMsg, makeMsg('bot', BOT_NAME, summary, 280)],
        nextSession: {
          ...session,
          step: 'confirm_rx',
          prescription: rx,
          quickActions: [
            { id: 'rx-confirm-yes', label: '✅ Enviar para revisión médica', value: 'rxconfirm:yes', variant: 'primary' },
            { id: 'rx-confirm-no', label: '❌ Cancelar', value: 'cmd:menu', variant: 'danger' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'confirm_rx') {
      if (input === 'rxconfirm:yes' || norm === 'si' || norm === 'confirmar') {
        const rx = session.prescription;
        const created = await medicalRequestsService.create(
          {
            type: 'receta',
            status: 'pendiente',
            priority: 'media',
            patientId: patient.id,
            doctorId: patient.assignedDoctorId,
            channel: 'whatsapp',
            description: `Solicitud vía WhatsApp (${rx.coverageName ?? ''} · Af. ${rx.affiliateNumber ?? ''}): ${rx.declaredMedication ?? ''} ${rx.dose ?? ''} (${rx.frequency ?? ''}). Motivo: ${rx.reason ?? ''}. Receta previa: ${rx.previousPrescriptionNote ?? 'No informada'}.`,
            medicationDetails: {
              declaredMedication: rx.declaredMedication ?? 'No especificado',
              dose: rx.dose ?? 'No especificada',
              frequency: rx.frequency ?? 'No especificada',
              reason: rx.reason ?? 'Renovación solicitada por paciente',
              lastIssuedDate: rx.previousPrescriptionFile ? 'Adjunta en conversación WhatsApp' : undefined,
            },
          },
          'Asistente WhatsApp (Bot)',
        );

        if (rx.previousPrescriptionFile) {
          await documentsService.uploadSimulated({
            patientId: patient.id,
            name: rx.previousPrescriptionFile.name,
            category: 'receta',
            fileType: rx.previousPrescriptionFile.fileType,
            sizeKb: rx.previousPrescriptionFile.sizeKb,
            uploadedBy: 'Paciente vía WhatsApp',
          });
        }

        await patientHistoryService.addEntry({
          patientId: patient.id,
          date: new Date().toISOString(),
          category: 'administrativo',
          title: 'Solicitud de receta vía WhatsApp',
          description: `Medicación declarada: ${rx.declaredMedication ?? ''} ${rx.dose ?? ''} (${rx.frequency ?? ''}). Derivada a revisión médica (${created.id}).`,
          doctorId: patient.assignedDoctorId,
        });

        if (patient.assignedDoctorId) {
          doctorPortalService.pushNotification({
            doctorId: patient.assignedDoctorId,
            category: 'receta',
            patientId: patient.id,
            title: 'Nueva solicitud de receta por WhatsApp',
            message: `${patient.firstName} ${patient.lastName} solicitó revisión de ${rx.declaredMedication ?? 'medicación declarada'} (${created.id.toUpperCase()}).`,
            type: 'warning',
            link: '/medico/recetas',
          });
        }

        const { nextSession } = goToMenu(session, '');
        return {
          messages: [
            patientMsg,
            makeMsg(
              'bot',
              BOT_NAME,
              `✅ **Solicitud registrada (${created.id})**\n\nTu pedido fue enviado al equipo médico para su **revisión y validación profesional**. Te avisaremos por este medio cuando haya una resolución.\n\n¿Necesitás realizar otra gestión?`,
              300,
            ),
          ],
          nextSession,
          attachments,
          mutatedDomain: true,
          toast: {
            title: 'Solicitud de receta creada',
            description: `Registrada como ${created.id} para revisión en Panel Administrativo y Panel Médico.`,
            variant: 'success',
          },
        };
      }

      const { botText, nextSession } = goToMenu(session, 'Solicitud de receta cancelada. ¿En qué más te puedo ayudar?');
      return { messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)], nextSession, attachments };
    }
  }

  // ==================== FLUJO 5: DOCUMENTACIÓN ====================
  if (session.flow === 'documentacion') {
    if (session.step === 'doc_category') {
      const rawType = input.startsWith('doctype:') ? input.slice(8) : input;
      const validTypes = ['Derivación', 'Estudio', 'Receta', 'Informe'] as const;
      const matched = validTypes.find((t) => normalizeText(t) === normalizeText(rawType));

      if (!matched) {
        return {
          messages: [patientMsg, makeMsg('bot', BOT_NAME, 'Seleccioná el tipo de documento que vas a enviar:', 250)],
          nextSession: session,
          attachments,
        };
      }

      const samples = SAMPLE_DOCS_BY_TYPE[matched];
      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            `Tipo seleccionado: **${matched}**.\n\nElegí un archivo de demostración para simular el envío (o usá el botón 📎 del campo de escritura):`,
            260,
          ),
        ],
        nextSession: {
          ...session,
          step: 'doc_file',
          document: { docTypeLabel: matched, category: mapDocTypeToCategory(matched) },
          quickActions: [
            ...samples.map((s, idx) => ({
              id: `sample-doc-${idx}`,
              label: `📎 ${s.name}`,
              value: `docfile:${idx}`,
              variant: idx === 0 ? ('primary' as const) : ('default' as const),
            })),
            { id: 'back-menu', label: '↩️ Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'doc_file') {
      const docType = session.document.docTypeLabel ?? 'Estudio';
      let chosenFile: ChatAttachment | undefined = options?.attachment;

      if (input.startsWith('docfile:')) {
        const idx = Number(input.slice(8));
        chosenFile = SAMPLE_DOCS_BY_TYPE[docType][idx];
        if (chosenFile) attachments[patientMsg.id] = chosenFile;
      } else if (!chosenFile) {
        const isImg = /\.(jpg|jpeg|png)$/i.test(input);
        chosenFile = {
          name: input.includes('.') ? input : `${docType}_${patient.lastName}.pdf`,
          fileType: isImg ? 'imagen' : 'pdf',
          sizeKb: 480,
          categoryLabel: docType,
        };
        attachments[patientMsg.id] = chosenFile;
      }

      if (!chosenFile) {
        return {
          messages: [patientMsg, makeMsg('bot', BOT_NAME, 'Adjuntá o seleccioná un archivo para continuar.', 250)],
          nextSession: session,
          attachments,
        };
      }

      return {
        messages: [
          patientMsg,
          makeMsg(
            'bot',
            BOT_NAME,
            `Archivo recibido: **${chosenFile.name}** (${chosenFile.sizeKb} KB · ${chosenFile.fileType.toUpperCase()}).\nClasificación sugerida: **${docType}**.\n\n¿Deseás agregar una breve aclaración o confirmar la recepción?`,
            280,
          ),
        ],
        nextSession: {
          ...session,
          step: 'confirm_doc',
          document: { ...session.document, file: chosenFile },
          quickActions: [
            { id: 'doc-confirm', label: '✅ Confirmar y archivar', value: 'docconfirm:yes', variant: 'primary' },
            { id: 'back-menu', label: '❌ Cancelar', value: 'cmd:menu' },
          ],
        },
        attachments,
      };
    }

    if (session.step === 'confirm_doc') {
      const file = session.document.file;
      const docType = session.document.docTypeLabel ?? 'Estudio';
      const category = session.document.category ?? 'estudio';

      if (norm === 'no' || norm === 'cancelar' || norm === 'cancel') {
        const { botText, nextSession } = goToMenu(session, 'Envío de documentación cancelado. ¿En qué más te puedo ayudar?');
        return { messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)], nextSession, attachments };
      }

      if (file && (input === 'docconfirm:yes' || norm === 'si' || norm === 'confirmar' || norm.length > 0)) {
        const finalName =
          docType === 'Derivación' && !file.name.toLowerCase().includes('derivacion')
            ? `Derivación - ${file.name}`
            : file.name;
        const noteText = input === 'docconfirm:yes' || norm === 'si' || norm === 'confirmar' ? '' : ` Nota del paciente: "${input}".`;

        const saved = await documentsService.uploadSimulated({
          patientId: patient.id,
          name: finalName,
          category,
          fileType: file.fileType,
          sizeKb: file.sizeKb,
          uploadedBy: 'Paciente vía WhatsApp',
        });

        await patientHistoryService.addEntry({
          patientId: patient.id,
          date: new Date().toISOString(),
          category: category === 'estudio' ? 'estudio' : 'administrativo',
          title: `Documentación recibida (${docType})`,
          description: `Archivo "${saved.name}" clasificado como ${docType} vía Chatbot WhatsApp.${noteText}`,
          doctorId: patient.assignedDoctorId,
        });

        if (patient.assignedDoctorId) {
          doctorPortalService.pushNotification({
            doctorId: patient.assignedDoctorId,
            category: 'documento',
            patientId: patient.id,
            title: `Nueva documentación recibida (${docType})`,
            message: `${patient.firstName} ${patient.lastName} envió "${saved.name}" por WhatsApp.`,
            type: 'info',
            link: '/medico/documentacion',
          });
        }

        const { nextSession } = goToMenu(session, '');
        return {
          messages: [
            patientMsg,
            makeMsg(
              'bot',
              BOT_NAME,
              `✅ **Documentación archivada y clasificada**\n• **Archivo:** ${saved.name}\n• **Clasificación:** ${docType}\n• **Referencia:** \`${saved.id}\`\n\nYa se encuentra disponible en tu legajo para el equipo administrativo y médico.\n\n¿Necesitás realizar otra gestión?`,
              300,
            ),
          ],
          nextSession,
          attachments,
          mutatedDomain: true,
          toast: {
            title: 'Documento clasificado y guardado',
            description: `"${saved.name}" se incorporó al legajo del paciente.`,
            variant: 'success',
          },
        };
      }
    }
  }

  // Fallback seguro
  const { botText, nextSession } = goToMenu(session, '¿En qué te puedo ayudar hoy? Elegí una opción del menú:');
  return {
    messages: [patientMsg, makeMsg('bot', BOT_NAME, botText, 250)],
    nextSession,
    attachments,
  };
}
