/**
 * Variables de entorno tipadas. Permiten alternar entre datos ficticios y la futura API REST
 * sin modificar páginas ni componentes.
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  useMocks: (import.meta.env.VITE_USE_MOCKS ?? 'true') !== 'false',
  mockDelay: Number(import.meta.env.VITE_MOCK_DELAY ?? 400),
} as const;
