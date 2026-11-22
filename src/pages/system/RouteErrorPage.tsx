import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { SystemMessage } from './SystemMessage';

export default function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <SystemMessage code="Error 404" title="Página no encontrada" description="La dirección ingresada no existe." />
    );
  }

  if (import.meta.env.DEV) console.error(error);

  return (
    <SystemMessage
      code="Error inesperado"
      title="Algo salió mal"
      description="Ocurrió un error al mostrar esta pantalla. Recargue la página o vuelva al inicio."
    >
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Recargar
      </button>
      <a
        href="/"
        className="inline-flex h-10 items-center rounded-lg bg-primary-700 px-4 text-sm font-medium text-white transition hover:bg-primary-800"
      >
        Ir al inicio
      </a>
    </SystemMessage>
  );
}
