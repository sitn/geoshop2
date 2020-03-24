import {Action, ActionReducer} from '@ngrx/store';
import {merge, pick} from 'lodash-es';

const STATE_KEYS = ['cart'];
// the key for the local storage.
const LOCAL_STORAGE_KEY = '__cart_storage__';

const setSavedState = (state: any, localStorageKey: string) => {
  localStorage.setItem(localStorageKey, JSON.stringify(state));
};

const getSavedState = (localStorageKey: string): any => {
  const item = localStorage.getItem(localStorageKey);
  return item ? JSON.parse(item) : undefined;
};

export function storageMetaReducer<S, A extends Action = Action>(reducer: ActionReducer<S, A>) {
  let onInit = true; // after load/refresh…
  return (state: S, action: A): S => {
    // reduce the nextState.
    const nextState = reducer(state, action);
    // init the application state.
    if (onInit) {
      onInit = false;
      const savedState = getSavedState(LOCAL_STORAGE_KEY);
      return merge(nextState, savedState);
    }
    // save the next state to the application storage.
    const stateToSave = pick(nextState, STATE_KEYS);
    setSavedState(stateToSave, LOCAL_STORAGE_KEY);
    return nextState;
  };
}
