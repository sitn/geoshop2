import {Injectable} from '@angular/core';
import {IProduct} from '../_models/IProduct';
import {forkJoin} from 'rxjs';
import {Order} from '../_models/IOrder';
import {ApiService} from './api.service';
import {AppState} from '../_store';
import {Store} from '@ngrx/store';
import {GeoshopUtils} from '../_helpers/GeoshopUtils';
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

  constructor(private apiService: ApiService,
              private store: Store<AppState>) {
  }

  public addOrderToStore(order: Order) {
    if (order.items.length === 0) {
      this.store.dispatch(updateOrder({
        order: order.toJson
      }));
      return;
    }

    const observables = order.items.map(x => this.apiService.find<IProduct>(Order.getProductLabel(x), 'product'));

    forkJoin(observables).subscribe(results => {
      for (const result of results) {
        for (const product of result.results) {

          for (const item of order.items) {
            if (Order.getProductLabel(item) === product.label) {
              item.product = product;
            }
          }
        }
      }
      this.store.dispatch(updateOrder({
        order: order.toJson
      }));
    });
  }
}
