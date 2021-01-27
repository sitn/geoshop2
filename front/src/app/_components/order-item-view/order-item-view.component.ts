import {Component, Input, OnInit} from '@angular/core';
import {IOrderDowloadLink, IOrderItem, Order} from '../../_models/IOrder';
import {IApiResponseError} from '../../_models/IApi';
import {GeoshopUtils} from '../../_helpers/GeoshopUtils';
import {ApiOrderService} from '../../_services/api-order.service';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'gs2-order-item-view',
  templateUrl: './order-item-view.component.html',
  styleUrls: ['./order-item-view.component.scss']
})
export class OrderItemViewComponent implements OnInit {

  displayedColumns: string[] = ['product', 'format', 'price', 'download'];
  @Input() dataSource: IOrderItem[];
  @Input() order: Order;

  constructor(private apiOrderService: ApiOrderService,
              private snackBar: MatSnackBar) {
  }

  ngOnInit(): void {
  }

  getProductLabel(orderItem: IOrderItem) {
    return Order.getProductLabel(orderItem);
  }

  downloadOrder(event: MouseEvent, id: number) {
    event.stopPropagation();
    event.preventDefault();

    this.apiOrderService.downloadOrder(id, true).subscribe(link => {
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
        const downloadLink = link.download_link;
        if (downloadLink) {
          const urlsParts = downloadLink.split('/');
          const filename = urlsParts.pop() || urlsParts.pop();
          GeoshopUtils.downloadData(downloadLink, filename || 'download.zip');
        }
      }

    });
  }
}
