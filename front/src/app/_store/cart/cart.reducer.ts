import {EntityState, EntityAdapter, createEntityAdapter} from '@ngrx/entity';
import {Product} from '../../_models/IProduct';
import {Action, createReducer, on} from '@ngrx/store';
import * as CartActions from './cart.action';
import {IOrder} from '../../_models/IOrder';

export interface CartState extends EntityState<Product>, IOrder {
  total: number;
}

export function selectProductId(a: Product): string {
  return a.url;
}

export function sortByLabel(a: Product, b: Product): number {
  return a.label.localeCompare(b.label);
}

export const adapter: EntityAdapter<Product> = createEntityAdapter<Product>({
  selectId: selectProductId,
  sortComparer: sortByLabel
});

export const initialState: CartState = adapter.getInitialState({
  total: 0,
  total_cost_currency: '',
  total_cost: '',
  title: '',
  status: 'DRAFT',
  processing_fee_currency: '',
  processing_fee: '',
  part_vat_currency: '',
  part_vat: '',
  order_type: '',
  order_contact: '',
  invoice_reference: '',
  invoice_contact: '',
  description: '',
  date_processed: undefined,
  date_ordered: undefined,
  date_downloaded: undefined,
  client: '',
  id: -1,
  url: '',
  geom: null,
  entities: {},
  ids: [],
  items: []
});

const cartReducer = createReducer(initialState,
  // @ts-ignore
  on(CartActions.deleteOrder, () => {
    return {
      entities: {},
      ids: [],
      total: 0,
      total_cost_currency: '',
      total_cost: '',
      title: '',
      status: 'DRAFT',
      processing_fee_currency: '',
      processing_fee: '',
      part_vat_currency: '',
      part_vat: '',
      order_type: '',
      order_contact: '',
      invoice_reference: '',
      invoice_contact: '',
      description: '',
      date_processed: undefined,
      date_ordered: undefined,
      date_downloaded: undefined,
      client: '',
      id: undefined,
      url: '',
      geom: null,
      items: []
    };
  }),
  on(CartActions.reloadOrder, (state, data) => {
    return {
      ...adapter.setAll(data.products, state),
      ...data.order
    };
  }),
  on(CartActions.updateOrder, (state, order) => {
    return {
      ...state,
      ...order
    };
  }),
  on(CartActions.addProduct, (state, {product}) => {
    return adapter.addOne(product, {...state, total: state.total + 10});
  }),
  on(CartActions.updateProduct, (state, {product}) => {
    return adapter.updateOne(product, state);
  }),
  on(CartActions.removeProduct, (state, {id}) => {
    return adapter.removeOne(id, {...state, total: state.total - 10});
  }),
  on(CartActions.removeAllProducts, (state) => {
    return adapter.removeAll(state);
  }),
  )
;

export function reducer(state: CartState | undefined, action: Action) {
  return cartReducer(state, action);
}

// get the selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal,
} = adapter.getSelectors();

// select the array of product ids
export const selectProductIds = selectIds;

// select the dictionary of product entities
export const selectProductEntities = selectEntities;

// select the array of products
export const selectAllProducts = selectAll;

// select the total product count
export const selectProductTotal = selectTotal;

export const selectCartTotal = (state: CartState) => state.total;
export const selectOrder = (state: CartState) => {
  const iOrder: IOrder = {
    total_cost_currency: state.total_cost_currency,
    total_cost: state.total_cost,
    title: state.title,
    status: state.status,
    processing_fee_currency: state.processing_fee_currency,
    processing_fee: state.processing_fee,
    part_vat_currency: state.part_vat_currency,
    part_vat: state.part_vat,
    order_type: state.order_type,
    order_contact: state.order_contact,
    invoice_reference: state.invoice_reference,
    invoice_contact: state.invoice_contact,
    description: state.description,
    date_processed: state.date_processed,
    date_ordered: state.date_ordered,
    date_downloaded: state.date_downloaded,
    client: state.client,
    id: state.id,
    url: state.url,
    geom: state.geom,
    items: state.items
  };

  return iOrder;
};
