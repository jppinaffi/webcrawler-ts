export type Store = 'kabum' | 'pichau' | 'terabyte';

export interface ScrapedProduct {
  title: string;
  price: number;
  inStock: boolean;
  store: Store;
  url: string;
}

export interface TargetLink {
  store: Store;
  url: string;
}

export interface Target {
  id: string;
  name: string;
  targetPrice: number;
  links: TargetLink[];
}

export interface AppConfig {
  targets: Target[];
}
