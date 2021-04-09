import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { ApiOrderService } from '../../_services/api-order.service';
import { GeoshopUtils } from '../../_helpers/GeoshopUtils';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Order, IOrderDowloadLink } from 'src/app/_models/IOrder';

@Component({
  selector: 'gs2-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss']
})
export class DownloadComponent implements OnInit, OnDestroy {

  @HostBinding('class') class = 'main-container';

  private onDestroy$ = new Subject<void>();
  private uuid: string;
  order: Order;

  constructor(private apiOrderService: ApiOrderService, private snackBar: MatSnackBar,
              private router: Router, private route: ActivatedRoute) {
    this.route.params
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(params => this.uuid = params.uuid);
  }

  ngOnInit(): void {
    this.apiOrderService.getOrderByUUID(this.uuid)
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(order => {
        if (order) {
          this.order = order;
        }
      });
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
  }

  downloadOrder(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    this.apiOrderService.downloadOrderByUUID(this.uuid).subscribe(link => {
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

}
