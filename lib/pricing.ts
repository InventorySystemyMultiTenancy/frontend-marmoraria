// Preview local (front-end) da fórmula padrão de precificação da marmoraria:
// material por m² + acabamento/frontão por metro linear (perímetro total) +
// instalação por metro linear (comprimento + as 2 laterais). O cálculo OFICIAL
// é sempre feito no backend usando a fórmula configurada em /admin/formula —
// isso aqui é só para dar uma estimativa em tempo real enquanto o usuário digita.
export const ACABAMENTO_RATE_PER_ML = 110;
export const INSTALACAO_RATE_PER_ML = 150;

export interface PieceBreakdown {
  areaM2: number;
  perimeterMl: number;
  threeSidePerimeterMl: number;
  material: number;
  acabamento: number;
  instalacao: number;
  unitPrice: number;
}

export function calcPieceBreakdown(widthCm: number, heightCm: number, pricePerM2: number): PieceBreakdown {
  const widthM = widthCm / 100;
  const heightM = heightCm / 100;
  const areaM2 = widthM * heightM;
  const perimeterMl = 2 * (widthM + heightM);
  const threeSidePerimeterMl = widthM + 2 * heightM;

  const material = areaM2 * pricePerM2;
  const acabamento = perimeterMl * ACABAMENTO_RATE_PER_ML;
  const instalacao = threeSidePerimeterMl * INSTALACAO_RATE_PER_ML;

  return {
    areaM2,
    perimeterMl,
    threeSidePerimeterMl,
    material,
    acabamento,
    instalacao,
    unitPrice: material + acabamento + instalacao,
  };
}
