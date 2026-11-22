import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/**
 * Ejecuta una función asíncrona (normalmente un servicio) y expone datos, error y carga.
 * Ignora respuestas obsoletas si las dependencias cambian antes de resolver.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const requestId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const execute = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (id === requestId.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === requestId.current) setState({ data: null, error: error as Error, loading: false });
    }
  }, [run]);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { ...state, reload: execute, setData: (data: T) => setState((s) => ({ ...s, data })) };
}
