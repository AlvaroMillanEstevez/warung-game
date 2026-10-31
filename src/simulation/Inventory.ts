export type Category = 'ingredients' | 'meals' | 'waste';
export type InventoryLimits = Readonly<Record<Category, number>>;
export interface InventoryState extends InventoryLimits { readonly limits: InventoryLimits }
export type ApplicableInventory = Readonly<Partial<InventoryLimits>>;

// Only applicable categories exist; a cleaner has no food compartments.
export class Inventory {
  private counts: Partial<Record<Category, number>>;
  private capacities: ApplicableInventory;
  constructor(limits: ApplicableInventory) {
    this.capacities = Object.freeze({ ...limits });
    this.counts = Object.fromEntries(Object.keys(limits).map(key => [key, 0]));
  }
  get state(): ApplicableInventory & { readonly limits: ApplicableInventory } { return { ...this.counts, limits: this.capacities }; }
  count(category: Category): number { return this.counts[category] ?? 0; }
  capacity(category: Category): number { return this.capacities[category] ?? 0; }
  canAdd(category: Category): boolean { return this.count(category) < this.capacity(category); }
  has(category: Category): boolean { return this.count(category) > 0; }
  change(category: Category, delta: 1 | -1): boolean {
    if (delta > 0 ? !this.canAdd(category) : !this.has(category)) return false;
    this.counts[category] = this.count(category) + delta;
    return true;
  }
  setLimits(limits: ApplicableInventory): void {
    if (Object.keys(this.counts).some(key => (limits[key as Category] ?? 0) < this.count(key as Category)))
      throw new Error('No se puede reducir una carga existente.');
    this.capacities = Object.freeze({ ...limits });
    this.counts = Object.fromEntries(Object.keys(limits).map(key => [key, this.count(key as Category)]));
  }
  snapshot(): Partial<Record<Category,number>> { return {...this.counts}; }
  restore(counts:Partial<Record<Category,number>>):void {
    for(const key of Object.keys(this.capacities) as Category[]) {
      const n=counts[key]??0;
      if(!Number.isSafeInteger(n)||n<0||n>this.capacity(key))throw new Error('Invalid inventory');
      this.counts[key]=n;
    }
    if(Object.keys(counts).some(k=>!(k in this.capacities)))throw new Error('Invalid inventory category');
  }
  reset(limits: ApplicableInventory = this.capacities): void {
    this.capacities = Object.freeze({ ...limits });
    this.counts = Object.fromEntries(Object.keys(limits).map(key => [key, 0]));
  }
}
