import {createAction, props} from '@ngrx/store';
import {IOrder} from '../../_models/IOrder';

export const UPDATE_ORDER = '[Cart] Update order';
export const UPDATE_GEOMETRY = '[Cart] Update geometry';
export const DELETE_ORDER = '[Cart] Delete order';

export const deleteOrder = createAction(
  DELETE_ORDER,
);

export const updateOrder = createAction(
  UPDATE_ORDER,
  props<{ order: IOrder }>()
);

export const updateGeometry = createAction(
  UPDATE_GEOMETRY,
  props<{ geom: string }>()
);
