import datos from './firma.json';

export const firma = datos;
export type Area = (typeof datos.areas)[number];

const soloDigitos = (s: string) => s.replace(/\D/g, '');

const d = datos.contacto.domicilio;
export const direccion = `${d.calle}, Col. ${d.colonia}, ${d.ciudad}, ${d.estado}, C.P. ${d.cp}`;
export const mapaUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;

// Los números se guardan como se escriben en México (10 dígitos); wa.me necesita el 52.
export const whatsappUrl = (mensaje = 'Hola, me gustaría una cita con VC Consultores.') => {
  const n = soloDigitos(datos.contacto.whatsapp);
  if (!n) return '';
  const intl = n.length === 10 ? `52${n}` : n;
  return `https://wa.me/${intl}?text=${encodeURIComponent(mensaje)}`;
};
export const telefonoUrl = datos.contacto.telefono ? `tel:+52${soloDigitos(datos.contacto.telefono).slice(-10)}` : '';

// La acción principal de cada botón "Agenda una cita": el canal más directo que exista.
export const contactoPrincipal = (mensaje?: string) => {
  const wa = whatsappUrl(mensaje);
  if (wa) return { href: wa, texto: 'Escríbenos por WhatsApp', externo: true };
  if (telefonoUrl) return { href: telefonoUrl, texto: `Llámanos al ${datos.contacto.telefono}`, externo: false };
  return { href: '/#contacto', texto: 'Agenda una cita', externo: false };
};
