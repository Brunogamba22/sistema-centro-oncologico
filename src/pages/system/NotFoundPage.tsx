import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { SystemMessage } from './SystemMessage';

export default function NotFoundPage() {
  useDocumentTitle('Página no encontrada');
  return (
    <SystemMessage
      code="Error 404"
      title="Página no encontrada"
      description="La dirección ingresada no existe o fue movida. Verifique el enlace o vuelva al inicio."
    />
  );
}
