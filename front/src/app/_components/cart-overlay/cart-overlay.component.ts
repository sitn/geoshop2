import {Component, HostBinding, OnInit} from '@angular/core';
import {AppState, isLoggedIn, selectAllProducts} from '../../_store';
import {Store} from '@ngrx/store';
import * as fromCart from '../../_store/cart/cart.action';
import {Product} from '../../_models/IProduct';
import {DialogMetadataComponent} from '../../welcome/catalog/dialog-metadata/dialog-metadata.component';
import {MatDialog} from '@angular/material/dialog';
import {ApiService} from '../../_services/api.service';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'gs2-cart-overlay',
  templateUrl: './cart-overlay.component.html',
  styleUrls: ['./cart-overlay.component.scss']
})
export class CartOverlayComponent implements OnInit {

  @HostBinding('class') class = 'overlay-container';

  products$ = this.store.select(selectAllProducts);
  isUserLoggedIn$ = this.store.select(isLoggedIn);

  constructor(private store: Store<AppState>,
              private dialog: MatDialog,
              private apiService: ApiService,
              private snackBar: MatSnackBar
  ) {
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
    if (product.metadataObject) {
      this.dialog.open(DialogMetadataComponent, {
        width: '60%',
        height: '90%',
        data: product.metadataObject,
        autoFocus: false,
      });
    } else {
      this.apiService.loadMetadata(product.metadata)
        .subscribe(result => {
          if (result) {
            this.store.dispatch(fromCart.updateProduct({product: {id: product.url, changes: {metadataObject: result}}}));
            this.dialog.open(DialogMetadataComponent, {
              width: '60%',
              height: '90%',
              data: result,
              autoFocus: false,
            });
          } else {
            this.snackBar.open('Métadonnée indisponible pour le moment.', 'Fermer', {duration: 3000});
          }
        });
    }
  }
}
