import {AuthState} from './auth/auth.reducer';
import {ActionReducer, ActionReducerMap, createFeatureSelector, createSelector, MetaReducer} from '@ngrx/store';
import {storeFreeze} from 'ngrx-store-freeze';
import {environment} from '../../environments/environment';
import * as fromAuth from './auth/auth.reducer';
import {CartState} from './cart/cart.reducer';
import * as fromCart from './cart/cart.reducer';
import {storageMetaReducer} from './storage.reducer';

export interface AppState {
  auth: AuthState;
  cart: CartState;
}

export const reducers: ActionReducerMap<AppState> = {
  auth: fromAuth.reducer,
  cart: fromCart.reducer,
};

export function logger(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return (state: AppState, action: any): AppState => {
    return reducer(state, action);
  };
}

export const metaReducers: MetaReducer<AppState>[] = !environment.production
  ? [logger, storeFreeze, storageMetaReducer]
  : [storageMetaReducer];

// AUTH store
export const authFeatureSelector = createFeatureSelector<fromAuth.AuthState>('auth');
export const isLoggedIn = createSelector(
  authFeatureSelector,
  (state) => state.loggedIn
);
export const getUser = createSelector(
  authFeatureSelector,
  (state) => state.user
);
export const getToken = createSelector(
  authFeatureSelector,
  (state) => state.user ? state.user.token : null
);

// CART store
export const cartFeatureSelector = createFeatureSelector<fromCart.CartState>('cart');

export const selectAllProduct = createSelector(
  cartFeatureSelector,
  fromCart.selectAllProduct
);
export const selectCartTotal = createSelector(
  cartFeatureSelector,
  fromCart.selectCartTotal
);
export const selectOrder = createSelector(
  cartFeatureSelector,
  fromCart.selectOrder
);
