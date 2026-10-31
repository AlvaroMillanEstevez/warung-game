import { DEBUG, ECONOMY } from '../config.ts';

// Local development fixture only. It never changes spending, unlocks or storage.
export function startingCoins(search: string, hostname: string, development: boolean): number {
  if (!development || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) return ECONOMY.initialCoins;
  const value = new URLSearchParams(search).get('monedas');
  if (!value || !/^\d+$/.test(value)) return ECONOMY.initialCoins;
  const coins = Number(value);
  return Number.isSafeInteger(coins) && coins <= DEBUG.maxStartingCoins ? coins : ECONOMY.initialCoins;
}

export function advancedSession(search:string,hostname:string,development:boolean):boolean {
 if(!development||!['localhost','127.0.0.1','::1','[::1]'].includes(hostname))return false;
 const params=new URLSearchParams(search);return params.has('monedas')||params.get('escenario')==='avanzado';
}
