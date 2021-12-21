import {Component, ComponentFactoryResolver, EventEmitter, Input, OnInit, Output, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {IOrderDowloadLink, IOrderSummary, Order} from '../../../_models/IOrder';
import {IProduct} from '../../../_models/IProduct';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import {GeoHelper} from '../../../_helpers/geoHelper';
import {OrderItemViewComponent} from '../../../_components/order-item-view/order-item-view.component';
import {WidgetHostDirective} from '../../../_directives/widget-host.directive';
import {ApiOrderService} from '../../../_services/api-order.service';
import {GeoshopUtils} from '../../../_helpers/GeoshopUtils';
import {MatSnackBar} from '@angular/material/snack-bar';
import {StoreService} from '../../../_services/store.service';
import {Router} from '@angular/router';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {ConfirmDialogComponent} from '../../../_components/confirm-dialog/confirm-dialog.component';
import Geometry from 'ol/geom/Geometry';

@Component({
  selector: 'gs2-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss']
})
export class OrderComponent implements OnInit {
  @Input() order: IOrderSummary;
  @Output() refreshOrders = new EventEmitter<number | null>();

  // Map
  @Input() minimap: Map;
  @Input() vectorSource: VectorSource<Geometry>;

  // Order items
  @ViewChild(WidgetHostDirective) orderItemTemplate: WidgetHostDirective;
  selectedOrder: Order;

  constructor(private cfr: ComponentFactoryResolver,
              private snackBar: MatSnackBar,
              private storeService: StoreService,
              private router: Router,
              private dialog: MatDialog,
              private apiOrderService: ApiOrderService) {
  }

  ngOnInit(): void {
  }

  downloadOrder(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.order || !this.order.id) {
      return;
    }

    this.apiOrderService.downloadOrder(this.order.id).subscribe(link => {
      if (!link) {
        this.snackBar.open(
          'Aucun fichier disponible', 'Ok', {panelClass: 'notification-info'}
        );
        return;
      }

      if (link.detail) {
        this.snackBar.open(
          link.detail, 'Ok', {panelClass: 'notification-info'}
        );
        return;
      }

      if (link.download_link) {
        const downloadLink = (link as IOrderDowloadLink).download_link;
        if (downloadLink) {
          const urlsParts = downloadLink.split('/');
          const filename = urlsParts.pop() || urlsParts.pop();
          GeoshopUtils.downloadData(downloadLink, filename || 'download.zip');
        }
      }
    });
  }

  duplicateInCart() {
    /**
     * Copy previous order to cart by resetting ids
     */
    if (this.selectedOrder) {
      const copy = GeoshopUtils.deepCopyOrder(this.selectedOrder.toJson);
      copy.id = -1;
      for (const item of copy.items) {
        if ((item.product as IProduct).label !== undefined) {
          item.product = (item.product as IProduct).label;
        }
        item.id = undefined;
        item.price = undefined;
        item.price_status = undefined;
        item.order = undefined;
        item.status = undefined;
      }
      this.storeService.addOrderToStore(new Order(copy));
      this.snackBar.open(
        'La commande a été dupliquée dans votre panier.', 'Ok', {
          panelClass: 'notification-info',
          duration: 5000,
        }
      );
      this.router.navigate(['']);
    }
  }

  pushBackToCart() {
    if (this.selectedOrder) {
      this.storeService.addOrderToStore(this.selectedOrder);
    }
  }

  confirmOrder() {
    let dialogRef: MatDialogRef<ConfirmDialogComponent> | null = this.dialog.open(ConfirmDialogComponent, {
      disableClose: false,
    });

    if (!dialogRef) {
      return;
    }

    dialogRef.componentInstance.noButtonTitle = 'Annuler';
    dialogRef.componentInstance.yesButtonTitle = 'Confirmer';
    dialogRef.componentInstance.confirmMessage = 'Etes-vous sûr de vouloir confimrer la commande ?';
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiOrderService.confirmOrder(this.selectedOrder.id).subscribe(confirmed => {
          if (confirmed) {
            this.refreshOrders.emit();
          }
        });
      }
      dialogRef = null;
    });
  }

  deleteOrder(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.order || !this.order.id) {
      return;
    }

    let dialogRef: MatDialogRef<ConfirmDialogComponent> | null = this.dialog.open(ConfirmDialogComponent, {
      disableClose: false,
    });

    if (!dialogRef) {
      return;
    }

    dialogRef.componentInstance.noButtonTitle = 'Annuler';
    dialogRef.componentInstance.yesButtonTitle = 'Supprimer';
    dialogRef.componentInstance.confirmMessage = `Etes-vous sûr de vouloir supprimer la commande "${this.order.title}" ?`;
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.order.id) {
        this.apiOrderService.delete(this.order.id).subscribe(confirmed => {
          if (confirmed) {
            this.refreshOrders.emit(this.order.id);
          }
        });
      }
      dialogRef = null;
    });
  }

  displayMiniMap() {
    if (this.selectedOrder) {
      GeoHelper.displayMiniMap(this.selectedOrder, [this.minimap], [this.vectorSource], 0);
      return;
    }

    this.apiOrderService.getOrder(this.order.url).subscribe((loadedOrder) => {
      if (loadedOrder) {
        this.selectedOrder = new Order(loadedOrder);
        this.order.statusAsReadableIconText = this.selectedOrder.statusAsReadableIconText;
        this.generateOrderItemsElements(this.selectedOrder);
        GeoHelper.displayMiniMap(this.selectedOrder, [this.minimap], [this.vectorSource], 0);
      }
    });
  }

  private generateOrderItemsElements(order: Order) {
    const componentFac = this.cfr.resolveComponentFactory(OrderItemViewComponent);
    const component = this.orderItemTemplate.viewContainerRef.createComponent(componentFac);
    component.instance.dataSource = order.items;
    component.instance.order = order;
    component.changeDetectorRef.detectChanges();
  }
}
