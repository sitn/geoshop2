import {Action, ActionReducer} from '@ngrx/store';
import {merge, pick} from 'lodash-es';
import {AppState} from './index';

const STATE_KEYS = ['cart', 'auth'];
// the key for the local storage.
const LOCAL_STORAGE_KEY = '__geoshop_storage__';

const setSavedState = (state: any, localStorageKey: string) => {
  localStorage.setItem(localStorageKey, JSON.stringify(state));
};

const getSavedState = (localStorageKey: string): any => {
  const item = localStorage.getItem(localStorageKey);

  try {
    return item ? JSON.parse(item) : undefined;
  } catch (error) {
    console.error(error);
    return undefined;
  }
};

export function storageMetaReducer<S, A extends Action = Action>(reducer: ActionReducer<S, A>) {
  let onInit = true; // after load/refresh…
  return (state: S, action: A): S => {
    // reduce the nextState.
    const nextState = reducer(state, action);
    // init the application state.
    if (onInit) {
      onInit = false;
      const savedState: AppState = getSavedState(LOCAL_STORAGE_KEY);
      return merge(nextState, savedState);
    }
    // save the next state to the application storage.
    const stateToSave = pick(nextState, STATE_KEYS);
    setSavedState(stateToSave, LOCAL_STORAGE_KEY);
    return nextState;
  };
}
