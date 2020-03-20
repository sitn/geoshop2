import {AuthState} from './auth/auth.reducer';
import {ActionReducer, ActionReducerMap, createFeatureSelector, createSelector, MetaReducer} from '@ngrx/store';
import {storeFreeze} from 'ngrx-store-freeze';
import {environment} from '../../environments/environment';

import * as fromAuth from './auth/auth.reducer';

export interface AppState {
  auth: AuthState;
}

export const reducers: ActionReducerMap<AppState> = {
  auth: fromAuth.reducer
};

// console.log all actions
export function logger(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return (state: AppState, action: any): AppState => {
    console.log('state', state);
    console.log('action', action);

    return reducer(state, action);
  };
}

export const metaReducers: MetaReducer<AppState>[] = !environment.production
  ? [logger, storeFreeze]
  : [];

export const authFeatureSelector = createFeatureSelector<fromAuth.AuthState>('auth');
export const isLoggedIn = createSelector(
  authFeatureSelector,
  (state) => state.loggedIn
);
export const getUser = createSelector(
  authFeatureSelector,
  (state) => state.user
);

