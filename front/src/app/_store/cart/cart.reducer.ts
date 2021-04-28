import {Action, createReducer, on} from '@ngrx/store';
import * as CartActions from './cart.action';
import {IOrder} from '../../_models/IOrder';

export interface CartState extends IOrder {
  total: number;
}

export const initialState: CartState = {
  total: 0,
  id: -1,
  total_with_vat_currency: '',
  total_with_vat: '',
  title: '',
  status: 'DRAFT',
  processing_fee_currency: '',
  processing_fee: '',
  part_vat_currency: '',
  part_vat: '',
  order_type: '',
  invoice_reference: '',
  email_deliver: '',
  invoice_contact: -1,
  description: '',
  date_processed: undefined,
  date_ordered: undefined,
  items: [],
  total_without_vat_currency: '',
  total_without_vat: '',
  geom: undefined
};

const cartReducer = createReducer(initialState,
  on(CartActions.deleteOrder, () => {
    const cartState: CartState = {
      total: 0,
      id: -1,
      total_with_vat_currency: '',
      total_with_vat: '',
      title: '',
      status: 'DRAFT',
      processing_fee_currency: '',
      processing_fee: '',
      part_vat_currency: '',
      part_vat: '',
      order_type: '',
      invoice_reference: '',
      email_deliver: '',
      invoice_contact: -1,
      description: '',
      date_processed: undefined,
      date_ordered: undefined,
      items: [],
      total_without_vat_currency: '',
      total_without_vat: '',
      geom: undefined
    };
    return cartState;
  }),
  on(CartActions.updateOrder, (state, data) => {
    return {
      ...state,
      ...data.order,
      total: data.order ? data.order.items.length : state.items.length
    };
  }),
  on(CartActions.updateGeometry, (state, data) => {
    return {
      ...state,
      geom: data.geom
    };
  }));

export function reducer(state: CartState | undefined, action: Action) {
  return cartReducer(state, action);
}

export const selectCartTotal = (state: CartState) => state.total;
export const selectOrder = (state: CartState) => state;
export const selectAllProduct = (state: CartState) => state.items.map(x => x.product);
