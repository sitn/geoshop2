import {Injectable} from '@angular/core';
import {IProduct, Product} from '../_models/IProduct';
import {forkJoin} from 'rxjs';
import {reloadOrder} from '../_store/cart/cart.action';
import {Order} from '../_models/IOrder';
import {ApiService} from './api.service';
import {AppState} from '../_store';
import {Store} from '@ngrx/store';

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
    const observables = order.items.map(x => this.apiService.find<IProduct>(x.product, 'product'));

    forkJoin(observables).subscribe(results => {
      const products: Product[] = [];
      for (const result of results) {
        for (const product of result.results) {
          if (order.items.findIndex(x => x.product === product.label) > -1 &&
            products.findIndex(x => x.label === product.label) === -1) {
            products.push(new Product(product));
          }
        }
      }
      this.store.dispatch(reloadOrder({
        order: order.toIorder,
        products
      }));
    });
  }
}
