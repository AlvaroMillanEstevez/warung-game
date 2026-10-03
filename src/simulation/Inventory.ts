export interface InventoryLimits { readonly ingredients: number; readonly meals: number; readonly waste: number }
export type Category = keyof InventoryLimits;
export interface InventoryState extends InventoryLimits { readonly limits: InventoryLimits }

export class Inventory {
  private counts = { ingredients: 0, meals: 0, waste: 0 };
  private capacities: InventoryLimits;
  constructor(limits: InventoryLimits) { this.capacities = Object.freeze({ ...limits }); }
  get state(): InventoryState { return { ...this.counts, limits: this.capacities }; }
  canAdd(category: Category): boolean { return this.counts[category] < this.capacities[category]; }
  has(category: Category): boolean { return this.counts[category] > 0; }
  change(category: Category, delta: 1 | -1): boolean {
    if (delta > 0 ? !this.canAdd(category) : !this.has(category)) return false;
    this.counts[category] += delta;
    return true;
  }
  setLimits(limits: InventoryLimits): void {
    if (Object.keys(this.counts).some(key => limits[key as Category] < this.counts[key as Category])) throw new Error('No se puede reducir una carga existente.');
    this.capacities = Object.freeze({ ...limits });
  }
  reset(limits: InventoryLimits = this.capacities): void {
    this.counts = { ingredients: 0, meals: 0, waste: 0 }; this.capacities = Object.freeze({ ...limits });
  }
}
