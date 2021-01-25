import {Component, ComponentFactoryResolver, Input, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {IOrder, IOrderDowloadLink, IOrderSummary, Order} from '../../../_models/IOrder';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import {GeoHelper} from '../../../_helpers/geoHelper';
import {OrderItemViewComponent} from '../../../_components/order-item-view/order-item-view.component';
import {WidgetHostDirective} from '../../../_directives/widget-host.directive';
import {ApiOrderService} from '../../../_services/api-order.service';
import {IApiResponseError} from '../../../_models/IApi';
import {GeoshopUtils} from '../../../_helpers/GeoshopUtils';
import {MatSnackBar} from '@angular/material/snack-bar';
import {StoreService} from '../../../_services/store.service';
import {Router} from '@angular/router';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {ConfirmDialogComponent} from '../../../_components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'gs2-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss']
})
export class OrderComponent implements OnInit {
  @Input() order: IOrderSummary;

  // Map
  @Input() minimap: Map;
  @Input() vectorSource: VectorSource;

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
    if (this.selectedOrder) {
      const copy = GeoshopUtils.deepCopyOrder(this.selectedOrder.toJson);
      copy.id = -1;
      this.storeService.addOrderToStore(new Order(copy));
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
        this.apiOrderService.confirmOrder(this.selectedOrder.id).subscribe(async confirmed => {
          if (confirmed) {
            await this.router.navigate(['/account/orders']);
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
        this.apiOrderService.confirmOrder(this.order.id).subscribe(async confirmed => {
          if (confirmed) {
            await this.router.navigate(['/account/orders']);
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
