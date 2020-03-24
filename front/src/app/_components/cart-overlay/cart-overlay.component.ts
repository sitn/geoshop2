import {Component, OnInit} from '@angular/core';
import {AppState, isLoggedIn, selectAllProducts, selectCartTotal} from '../../_store';
import {Store} from '@ngrx/store';
import * as fromCart from '../../_store/cart/cart.action';
import {Product} from '../../_models/IProduct';
import {DialogMetadataComponent} from '../../welcome/catalog/dialog-metadata/dialog-metadata.component';
import {MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'gs2-cart-overlay',
  templateUrl: './cart-overlay.component.html',
  styleUrls: ['./cart-overlay.component.scss']
})
export class CartOverlayComponent implements OnInit {

  total$ = this.store.select(selectCartTotal);
  products$ = this.store.select(selectAllProducts);
  isUserLoggedIn$ = this.store.select(isLoggedIn);

  constructor(private store: Store<AppState>, private dialog: MatDialog) {
  }

  ngOnInit(): void {
  }

  emptyCart() {
    this.store.dispatch(fromCart.removeAllProducts());
  }

  removeProduct(url: string) {
    this.store.dispatch(fromCart.removeProduct({id: url}));
  }

  openMetadata(product: Product) {
    this.dialog.open(DialogMetadataComponent, {
      width: '500px',
      data: product.metadata
    });
  }
}
