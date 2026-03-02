import type { FeeStructure } from '../types/fees';

export function computeFeeCents(subtotalCents: number, fee: FeeStructure): number {
  if (fee.type === 'flat') return fee.valueCents;
  return Math.round((subtotalCents * fee.valuePercent) / 100);
}
