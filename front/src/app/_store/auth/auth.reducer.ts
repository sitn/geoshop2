import * as AuthActions from './auth.action';
import {IIdentity} from '../../_models/IIdentity';
import {Action, createReducer, on} from '@ngrx/store';

export interface AuthState {
  loggedIn: boolean;
  user: IIdentity | null;
}

const initialState: AuthState = {
  loggedIn: false,
  user: null,
};

const authReducer = createReducer(
  initialState,
  on(AuthActions.loginSuccess, (state, {identity}) => ({...state, loggedIn: true, user: identity})),
  on(AuthActions.logout, state => ({...state, loggedIn: false, user: null}))
);

export function reducer(state: AuthState | undefined, action: Action) {
  return authReducer(state, action);
}

