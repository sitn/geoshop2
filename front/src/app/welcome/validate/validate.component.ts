import { takeUntil } from 'rxjs/operators';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';

import { GeoHelper } from '../../_helpers/geoHelper';
import { Order, OrderItem} from '../../_models/IOrder';
import { ApiOrderService } from '../../_services/api-order.service';
import { ConfigService } from '../../_services/config.service';
import { MapService } from '../../_services/map.service';
import Geometry from 'ol/geom/Geometry';
import { Feature } from 'ol';


@Component({
  selector: 'gs2-validate',
  templateUrl: './validate.component.html',
  styleUrls: ['./validate.component.scss']
})
export class ValidateComponent implements OnInit, OnDestroy {

  @HostBinding('class') class = 'main-container';

  private onDestroy$ = new Subject<void>();
  private token: string;
  order: Order;
  orderitem: OrderItem;
  minimap: Map;
  vectorSource: VectorSource<Feature<Geometry>>;


  constructor(
    private apiOrderService: ApiOrderService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private configService: ConfigService,
    private mapService: MapService) {
    this.route.params
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(params => this.token = params.token);
  }

  ngOnInit(): void {
    this.apiOrderService.getOrderItemByToken(this.token)
      .subscribe(iOrderItem => {
        if (iOrderItem) {
          this.orderitem = new OrderItem(iOrderItem);
          this.apiOrderService.getOrderByUUID(iOrderItem.order_guid).pipe(takeUntil(this.onDestroy$))
            .subscribe(order => {
              if (order) {
                this.order = order;
                GeoHelper.generateMiniMap(this.configService, this.mapService).then(result => {
                  this.minimap = result.minimap;
                  this.vectorSource = result.vectorSource;
                  GeoHelper.displayMiniMap(this.order, [this.minimap], [this.vectorSource], 0);
                });
              }
            });
        } else {
          this.router.navigate(['/welcome']);
        }
      });
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
  }

  proceedOrder(isAccepted: boolean) {
    this.apiOrderService.updateOrderItemStatus(this.token, isAccepted).subscribe(async confirmed => {
      if (confirmed) {
        await this.router.navigate(['/welcome']);
      }
    });
  }
}
