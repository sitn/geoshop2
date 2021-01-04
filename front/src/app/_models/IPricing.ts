export type PricingStatus = 'PENDING' | 'CALCULATED' | 'IMPORTED';

export interface IPricing {
  name: string;
  pricing_type: string;
  base_fee: number;
  min_price: number;
  max_price: number;
  unit_price: number;
}
