import {createAction, props} from '@ngrx/store';
import {Product} from '../../_models/IProduct';
import {Update} from '@ngrx/entity';
import {IOrder} from '../../_models/IOrder';

export const ADD_PRODUCT = '[Cart] Add product';
export const UPDATE_PRODUCT = '[Cart] Update product';
export const REMOVE_PRODUCT = '[Cart] Remove product';
export const REMOVE_ALL_PRODUCTS = '[Cart] Remove all products';
export const RELOAD_ORDER = '[Cart] Reload order';
export const DELETE_ORDER = '[Cart] Delete order';

export const deleteOrder = createAction(
  DELETE_ORDER,
);

export const reloadOrder = createAction(
  RELOAD_ORDER,
  props<{ order: IOrder, products: Product[] }>()
);

export const addProduct = createAction(
  ADD_PRODUCT,
  props<{ product: Product }>()
);

export const updateProduct = createAction(
  UPDATE_PRODUCT,
  props<{ product: Update<Product> }>()
);

export const removeProduct = createAction(
  REMOVE_PRODUCT,
  props<{ id: string }>()
);

export const removeAllProducts = createAction(
  REMOVE_ALL_PRODUCTS
);



