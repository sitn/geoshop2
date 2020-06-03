import {  Component, DoCheck, OnDestroy, OnInit} from '@angular/core';
import {ApiService} from '../../_services/api.service';
import {GeoHelper} from '../../_helpers/geoHelper';
import {ConfigService} from '../../_services/config.service';
import {MapService} from '../../_services/map.service';
import {Order} from '../../_models/IOrder';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {AppState} from '../../_store';
import {Store} from '@ngrx/store';
import {reloadOrder} from '../../_store/cart/cart.action';

@Component({
  selector: 'gs2-last-draft',
  templateUrl: './last-draft.component.html',
  styleUrls: ['./last-draft.component.scss']
})
export class LastDraftComponent implements OnInit, DoCheck, OnDestroy {

  private onDestroy$ = new Subject<boolean>();

  order: Order | null;
  lastOrderUrl: string | null;

  constructor(
    private apiService: ApiService, private configService: ConfigService, private mapService: MapService,
    private store: Store<AppState>,
  ) {
    this.apiService.getLastDraft().pipe(
      takeUntil(this.onDestroy$)
    ).subscribe(order => this.order = order);
  }

  ngOnInit(): void {
  }

  ngDoCheck(): void {
    if (this.order) {
      if (!this.lastOrderUrl || this.lastOrderUrl !== this.order.url) {
        GeoHelper.generateMiniMap(this.configService, this.mapService).then((config) => {
          if (this.order) {
            GeoHelper.displayMiniMap(this.order, [config.minimap], [config.vectorSource], 0);
            this.lastOrderUrl = '' + this.order.url;
          }
        }).catch((error) => console.error(error));
      }
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
  }

  reloadCart() {
    if (this.order) {
      this.store.dispatch(reloadOrder({
        order: this.order.toIorder,
        products: []
      }));
    }
  }
}
