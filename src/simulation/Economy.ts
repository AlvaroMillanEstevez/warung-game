import { ECONOMY } from '../config.ts';

export type SupplyPayment = 'cash' | 'credit' | 'large';
export interface IncomeSplit { gross: number; repaid: number; net: number; remainingDebt: number }

// Both checkout and board claims use this integer split. Collecting the tray is not income.
export function splitIncome(gross: number, debt: number): IncomeSplit {
  if (![gross, debt].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('Invalid income or debt');
  const repaid = Math.min(debt, Math.floor(gross * ECONOMY.repaymentRatio));
  return { gross, repaid, net: gross - repaid, remainingDebt: debt - repaid };
}
