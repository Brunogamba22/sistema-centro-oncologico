/**
 * Identidad institucional centralizada.
 * Para cambiar el nombre, contacto o logotipo del centro, editar únicamente este archivo.
 */
export interface BrandConfig {
  name: string;
  shortName: string;
  productName: string;
  tagline: string;
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
  };
  /** URL de una imagen de logotipo. Si es null se usa el isotipo SVG por defecto (LogoMark). */
  logoUrl: string | null;
  copyrightYear: number;
}

export const BRAND: BrandConfig = {
  name: 'Centro Oncológico Integral',
  shortName: 'COI',
  productName: 'Sistema Integral de Gestión Oncológica',
  tagline: 'Gestión oncológica integral',
  contact: {
    phone: '+54 11 4000-0000',
    whatsapp: '+54 9 11 4000-0000',
    email: 'contacto@centro-oncologico.demo',
    address: 'Av. Ejemplo 1234, CABA (dirección ficticia)',
  },
  logoUrl: null,
  copyrightYear: 2026,
};
