import {EntityState, EntityAdapter, createEntityAdapter} from '@ngrx/entity';
import {Product} from '../../_models/IProduct';
import {Action, createReducer, on} from '@ngrx/store';
import * as CartActions from './cart.action';

export interface CartState extends EntityState<Product> {
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
});

const cartReducer = createReducer(initialState,
  on(CartActions.addProduct, (state, {product}) => {
    return adapter.addOne(product, {...state, total: state.total + 10});
  }),
  on(CartActions.removeProduct, (state, {id}) => {
    return adapter.removeOne(id, {...state, total: state.total - 10});
  }),
  on(CartActions.removeAllProducts, (state) => {
    return adapter.removeAll(state);
  }),
);

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
