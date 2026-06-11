export interface NappyType {
  id: string;
  name: string;
  count: number;
  minThreshold: number;
  boxQuantity: number;
}

export interface InventoryHistoryLog {
  id: string;
  nappyTypeId: string;
  nappyTypeName: string;
  timestamp: string;
  change: number; // e.g. +1, -1, +40 etc
  type: 'increment' | 'decrement' | 'quick-add' | 'init';
}
