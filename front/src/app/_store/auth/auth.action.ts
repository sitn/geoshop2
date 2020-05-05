import {createAction, props} from '@ngrx/store';
import {ICredentials, IIdentity} from '../../_models/IIdentity';
import {IApiResponseError} from '../../_models/IApi';

export const LOGIN = '[Auth] Login';
export const LOGIN_SUCCESS = '[Auth] Login success';
export const LOGIN_FAILURE = '[Auth] Login failure';
export const LOGOUT = '[Auth] Logout';
export const LOGOUT_SUCCESS = '[Auth] Logout success';

export const login = createAction(
  LOGIN,
  props<{ credentials: ICredentials, callbackUrl: string }>()
);

export const loginSuccess = createAction(
  LOGIN_SUCCESS,
  props<{ identity: Partial<IIdentity>, callbackUrl: string }>()
);

export const loginFailure = createAction(
  LOGIN_FAILURE,
  props<IApiResponseError>());

export const logout = createAction(LOGOUT);

export const logoutSuccess = createAction(
  LOGOUT_SUCCESS,
);
