import { OPENING, PROGRESSION } from '../config.ts';
import type { Key } from '../i18n/core.ts';
import { OFFICE, ORDER_BOARD } from '../world/layout.ts';
import type { InteractionZone } from '../world/layout.ts';
export type OpeningBuildId = 'repair' | 'fridge' | 'stove' | 'counter';
export type BuildId = OpeningBuildId | 'office' | 'orders';
export const BUILD_ORDER: readonly OpeningBuildId[] = ['repair','fridge','stove','counter'];
export const BUILD_POINTS = { repair: {x:378,y:620}, fridge:{x:155,y:288}, stove:{x:320,y:288}, counter:{x:575,y:282}, office:OFFICE.interaction, orders:ORDER_BOARD.interaction } as const;
export const OPEN_POINT = {x:840,y:690} as const;
export function buildZone(id: BuildId): InteractionZone { return {id:'build-'+id,stationId:'build-'+id,role:'construction',name:('opening.'+id) as Key,position:BUILD_POINTS[id]}; }
export function freshOpening(advanced: boolean) { return { repaired:advanced, fridge:advanced, stove:advanced, counter:advanced, open:advanced,
  moved:false, supplied:false, ingredients:false, cooked:false, meal:false, deposited:false, sold:false, collected:false,
  introSeen:false, completionSeen:false, spent:0 }; }
export type OpeningState = ReturnType<typeof freshOpening>;
export function nextBuild(state: OpeningState): OpeningBuildId | null { return BUILD_ORDER.find(id=>!(id==='repair'?state.repaired:state[id]))??null; }
export function buildCost(id:BuildId):number { return id==='office'||id==='orders'?PROGRESSION.prices[id]:OPENING.prices[id]; }

export function freshProgression(advanced:boolean) { return { office:advanced, bin:advanced, orders:advanced, officeNotice:false, diningNotice:false, ordersNotice:false }; }
