// Medidas aceitam até 4 casas decimais (ex: 0,035 ou 12,3456).
export const MEASURE_DECIMALS = 4;

/**
 * Normaliza o que a pessoa digita num campo de medida: aceita vírgula ou ponto
 * (vira ponto, para `Number()` funcionar), descarta letras, mantém um único
 * separador e corta as casas decimais além do limite.
 */
export function sanitizeDecimal(raw: string, maxDecimals = MEASURE_DECIMALS): string {
  const cleaned = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned;
  const intPart = cleaned.slice(0, dot) || '0';
  const decimals = cleaned.slice(dot + 1).replace(/\./g, '').slice(0, maxDecimals);
  return `${intPart}.${decimals}`;
}
