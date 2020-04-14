import {IProduct} from './IProduct';
import {IFormat} from './IFormat';

export interface IOrder {
  id: string;
  processing_fee: number;
  total_cost: number;
  vat: number;
  orderItems: IOrderItem[];
}

export interface IOrderItem {
  id: string;
  product: IProduct;
  order?: IOrder;
  format?: IFormat;
  last_download?: Date;
}

export interface IOrderType {
  id: number;
  name: string;
}
