// Garden types
export interface GardenItem {
  id: string;
  type: string;
  x: number;
  y: number;
  state: 'healthy' | 'wilted';
}
