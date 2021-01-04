import {Component, HostBinding, OnDestroy, OnInit} from '@angular/core';
import {AppState, isLoggedIn, selectOrder} from '../../_store';
import {Store} from '@ngrx/store';
import * as fromCart from '../../_store/cart/cart.action';
import {IProduct} from '../../_models/IProduct';
import {DialogMetadataComponent} from '../../welcome/catalog/dialog-metadata/dialog-metadata.component';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {ApiService} from '../../_services/api.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ConfirmDialogComponent} from '../confirm-dialog/confirm-dialog.component';
import {Router} from '@angular/router';
import {ApiOrderService} from '../../_services/api-order.service';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {StoreService} from '../../_services/store.service';
import {MapService} from '../../_services/map.service';
import {IOrder, Order} from '../../_models/IOrder';
import {GeoshopUtils} from '../../_helpers/GeoshopUtils';

@Component({
  selector: 'gs2-cart-overlay',
  templateUrl: './cart-overlay.component.html',
  styleUrls: ['./cart-overlay.component.scss']
})
export class CartOverlayComponent implements OnInit, OnDestroy {

  @HostBinding('class') class = 'overlay-container';

  order: IOrder;
  products: Array<IProduct> = [];

  private isUserLoggedIn = false;
  private onDestroy$ = new Subject();

  constructor(private store: Store<AppState>,
              private dialog: MatDialog,
              public mapService: MapService,
              private apiService: ApiService,
              private apiOrderService: ApiOrderService,
              private snackBar: MatSnackBar,
              private router: Router,
              private storeService: StoreService
  ) {
    this.store.select(isLoggedIn).subscribe(x => this.isUserLoggedIn = x);
    this.store.select(selectOrder).subscribe(x => {
      this.order = x;
      this.products = this.order.items.map(o => o.product as IProduct);
    });
  }

  ngOnInit(): void {
  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
  }

  removeProduct(label: string) {
    const order = GeoshopUtils.deepCopyOrder(this.order);
    order.items = order.items.filter(x => Order.getProductLabel(x) !== label);
    this.store.dispatch(fromCart.updateOrder({order}));
  }

  openMetadata(product: IProduct) {
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

            const order = GeoshopUtils.deepCopyOrder(this.order);
            for (const item of order.items) {
              if (typeof item.product !== 'string') {
                if (item.product.label === product.label) {
                  item.product.metadataObject = result;
                  break;
                }
              }
            }

            this.store.dispatch(fromCart.updateOrder({order}));
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

  private tryGetLastDraft() {
    this.apiOrderService.getLastDraft()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(order => {
        if (order) {
          let dialogRef: MatDialogRef<ConfirmDialogComponent> | null = this.dialog.open(ConfirmDialogComponent, {
            disableClose: false,
          });

          dialogRef.componentInstance.noButtonTitle = 'Continuer';
          dialogRef.componentInstance.yesButtonTitle = 'Recharger';
          dialogRef.componentInstance.confirmMessage = 'Vous avez un panier sauvegardé, voulez-vous le recharger ou' +
            ' continuer avec le panier actuel ?';
          dialogRef.afterClosed().subscribe(result => {
            if (result) {
              this.storeService.addOrderToStore(order);
            }
            dialogRef = null;
          });
        }
        this.storeService.IsLastDraftAlreadyLoadedOrChecked = true;
        this.naviguateToNewOrder();
      });
  }

  deleteCart() {
    let dialogRef: MatDialogRef<ConfirmDialogComponent> | null = this.dialog.open(ConfirmDialogComponent, {
      disableClose: false,
    });

    dialogRef.componentInstance.confirmMessage = 'Voulez-vous supprimer le panier (remise à zéro) ?';
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(fromCart.deleteOrder());
      }
      dialogRef = null;
    });
  }

  naviguateToNewOrder() {
    if (this.isUserLoggedIn) {
      if (!this.storeService.IsLastDraftAlreadyLoadedOrChecked) {
        this.tryGetLastDraft();
        return;
      }
      this.router.navigate(['/account/new-order'], {
        queryParams: {
          callback: '/account/new-order'
        }
      });
    } else {
      this.router.navigate(['/auth/login'], {
        queryParams: {
          callback: '/account/new-order'
        }
      });
    }
  }
}
