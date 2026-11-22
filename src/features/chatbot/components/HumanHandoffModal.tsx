import { useState } from 'react';
import { Button, Modal, Select } from '@/components/ui';
import type { WhatsAppConversation } from '@/types';

const DEPARTMENTS: WhatsAppConversation['department'][] = [
  'Recepción',
  'Turnos',
  'Documentación',
  'Asistente virtual',
];

const OPERATORS = ['Lucía Benítez', 'Sofía Pereyra', 'Mariana Sosa', 'Federico Alarcón'];

interface HumanHandoffModalProps {
  open: boolean;
  conversation: WhatsAppConversation;
  onClose: () => void;
  onConfirmTransfer: (department: WhatsAppConversation['department'], operator?: string) => void;
  onResolve: () => void;
}

export function HumanHandoffModal({
  open,
  conversation,
  onClose,
  onConfirmTransfer,
  onResolve,
}: HumanHandoffModalProps) {
  const [department, setDepartment] = useState<WhatsAppConversation['department']>(
    conversation.department === 'Asistente virtual' ? 'Recepción' : conversation.department,
  );
  const [operator, setOperator] = useState<string>(conversation.assignedTo ?? '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Gestión de atención humana"
      description="Derivá la conversación a un área, asigná un operador o devolvela al asistente virtual."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {conversation.status !== 'resuelta' ? (
            <Button variant="ghost" onClick={onResolve}>
              Marcar resuelta
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => onConfirmTransfer(department, operator || undefined)}>Aplicar</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Select
          label="Área de destino"
          value={department}
          onChange={(e) => setDepartment(e.target.value as WhatsAppConversation['department'])}
          options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
        />

        {department !== 'Asistente virtual' && (
          <Select
            label="Operador asignado"
            placeholder="Dejar en cola del área (sin asignar)"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            options={OPERATORS.map((op) => ({ value: op, label: op }))}
          />
        )}
      </div>
    </Modal>
  );
}
