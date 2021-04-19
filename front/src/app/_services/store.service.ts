import {Injectable} from '@angular/core';
import {IProduct} from '../_models/IProduct';
import {forkJoin} from 'rxjs';
import {Order} from '../_models/IOrder';
import {ApiService} from './api.service';
import {AppState} from '../_store';
import {Store} from '@ngrx/store';
import {updateOrder} from '../_store/cart/cart.action';

@Injectable({
  providedIn: 'root'
})
export class StoreService {

  private isLastDraftAlreadyLoadedOrChecked = false;

  public get IsLastDraftAlreadyLoadedOrChecked() {
    return this.isLastDraftAlreadyLoadedOrChecked;
  }

  public set IsLastDraftAlreadyLoadedOrChecked(isLoaded: boolean) {
    this.isLastDraftAlreadyLoadedOrChecked = isLoaded;
  }

  constructor(private store: Store<AppState>) {
  }

  public addOrderToStore(order: Order) {
    if (order.items.length === 0) {
      this.store.dispatch(updateOrder({
        order: order.toJson
      }));
      return;
    }
    this.store.dispatch(updateOrder({
      order: order.toJson
    }));
  }
}
