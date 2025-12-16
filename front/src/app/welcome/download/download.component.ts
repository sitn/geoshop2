import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';

import { GeoHelper } from '../../_helpers/geoHelper';
import { Order } from '../../_models/IOrder';
import { ApiOrderService } from '../../_services/api-order.service';
import { ConfigService} from '../../_services/config.service';
import { MapService} from '../../_services/map.service';
import Geometry from 'ol/geom/Geometry';
import { Feature } from 'ol';
import { HttpResponse } from '@angular/common/http';


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
  minimap: Map;
  vectorSource: VectorSource<Feature<Geometry>>;

  constructor(
    private apiOrderService: ApiOrderService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private configService: ConfigService,
    private mapService: MapService) {
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
          GeoHelper.generateMiniMap(this.configService, this.mapService).then(result => {
            this.minimap = result.minimap;
            this.vectorSource = result.vectorSource;
            GeoHelper.displayMiniMap(this.order, [this.minimap], [this.vectorSource], 0);
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
  }

  downloadOrder(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    this.apiOrderService.downloadResult(this.uuid, this.order.id);
  }
}
