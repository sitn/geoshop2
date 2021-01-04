import {Component, ComponentFactoryResolver, ElementRef, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {BehaviorSubject, merge, of} from 'rxjs';
import {IOrder, IOrderDowloadLink, IOrderItem, IOrderSummary, Order} from '../../_models/IOrder';
import {debounceTime, filter, map, mergeMap, scan, skip, switchMap, tap} from 'rxjs/operators';
import {MapService} from '../../_services/map.service';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import {ConfigService} from '../../_services/config.service';
import {FormControl} from '@angular/forms';
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {GeoHelper} from '../../_helpers/geoHelper';
import {ApiOrderService} from '../../_services/api-order.service';
import {ApiService} from '../../_services/api.service';
import {OrderItemViewComponent} from '../../_components/order-item-view/order-item-view.component';
import {WidgetHostDirective} from '../../_directives/widget-host.directive';
import {AppState} from '../../_store';
import {Store} from '@ngrx/store';
import {StoreService} from '../../_services/store.service';
import {GeoshopUtils} from '../../_helpers/GeoshopUtils';
import {IApiResponseError} from '../../_models/IApi';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'gs2-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
})
export class OrdersComponent implements OnInit {

  private currentIndex = 0;

  // Infinity scrolling
  @ViewChild(CdkVirtualScrollViewport) viewport: CdkVirtualScrollViewport;
  batch = 10;
  realBatch = 10;
  offset = new BehaviorSubject<number | null>(0);
  currentOrders: IOrderSummary[] = [];
  total = 0;
  stepToLoadData = 0;
  readonly itemHeight = 48;

  // Order items
  @ViewChildren(WidgetHostDirective) orderItemTemplates: QueryList<WidgetHostDirective>;
  selectedOrder: Order;

  // Map
  private minimap: Map;
  private vectorSource: VectorSource;

  // Filtering
  orderFilterControl = new FormControl('');
  isSearchLoading$ = new BehaviorSubject(false);

  constructor(private apiOrderService: ApiOrderService,
              private apiService: ApiService,
              private mapService: MapService,
              private configService: ConfigService,
              private elRef: ElementRef,
              private cfr: ComponentFactoryResolver,
              private store: Store<AppState>,
              private storeService: StoreService,
              private snackBar: MatSnackBar,
  ) {
  }

  ngOnInit(): void {
    const firstElement = this.elRef.nativeElement.children[0].clientHeight;
    const heightAvailable = this.elRef.nativeElement.clientHeight - firstElement;

    const ratio = heightAvailable / this.itemHeight;
    const numberOfRowPossible = ratio > 1 ? Math.trunc(ratio) + 1 : Math.trunc(ratio);

    const half = Math.trunc(numberOfRowPossible / 2);
    this.stepToLoadData = numberOfRowPossible - half;
    this.realBatch = numberOfRowPossible;
    this.batch = numberOfRowPossible + 1;

    GeoHelper.generateMiniMap(this.configService, this.mapService).then(result => {
      this.minimap = result.minimap;
      this.vectorSource = result.vectorSource;

      this.initializeComponentAction();
    });
  }

  getBatch(offset: number) {
    const init: { [key: string]: IOrderSummary } = {};

    return this.apiOrderService.getOrders(offset, this.batch)
      .pipe(
        tap(response => this.total = response.count),
        map((response) =>
          response.results.sort((a) => a.status === 'PENDING' ? 1 : a.status === 'READY' ? 1 : 0).map(p => {
            p.statusAsReadableIconText = Order.initializeStatus(p);
            p.id = GeoshopUtils.ExtractIdFromUrl(p.url);
            return p;
          })
        ),
        map(arr => {
          return arr.reduce((acc, cur) => {
            const id = cur.url;
            const res: { [key: string]: IOrderSummary } = {...acc, [id]: cur};
            return res;
          }, init);
        })
      );
  }

  nextBatch(e: number, offset: number) {
    if (this.currentIndex === e) {
      return;
    }
    this.currentIndex = e;
    if (offset + 1 >= this.total) {
      return;
    }

    const end = this.viewport.getRenderedRange().end;
    const total = this.viewport.getDataLength();

    if (end === total) {
      this.offset.next(offset);
    }
  }

  private initializeComponentAction() {
    const init: { [key: string]: IOrderSummary } = {};

    const batchMap = this.offset.pipe(
      filter((x) => x != null && x >= 0),
      mergeMap((n: number) => this.getBatch(n)),
      scan((acc, batch) => {
        return {...acc, ...batch};
      }, init),
      map(v => {
        return Object.values(v);
      })
    );

    merge(
      batchMap,
      this.orderFilterControl.valueChanges.pipe(
        skip(1),
        debounceTime(500),
        switchMap(inputText => {
          this.isSearchLoading$.next(true);

          if (!inputText || inputText.length < 3) {
            this.offset.next(0);
            return of([]);
          }

          return this.apiService.find<IOrderSummary>(inputText, 'order').pipe(
            map(response => {
              this.total = response.count;
              return response.results.map(x => {
                x.statusAsReadableIconText = Order.initializeStatus(x);
                x.id = GeoshopUtils.ExtractIdFromUrl(x.url);
                return x;
              });
            }),
          );
        })
      )
    ).subscribe(orders => {
      this.currentOrders = orders;
      this.isSearchLoading$.next(false);
    });
  }

  private generateOrderItemsElements(order: Order, index: number) {
    const componentFac = this.cfr.resolveComponentFactory(OrderItemViewComponent);
    this.orderItemTemplates.forEach((item, i) => {
      if (index === i && item.viewContainerRef.length === 0) {
        const component = item.viewContainerRef.createComponent(componentFac);
        component.instance.dataSource = order.items;
        component.changeDetectorRef.detectChanges();
        return;
      }
    });
  }

  displayMiniMap(orderSummary: IOrderSummary | Order, index: number) {
    this.apiOrderService.getOrder((orderSummary as IOrderSummary).url).subscribe((loadedOrder) => {
      if (loadedOrder) {
        this.selectedOrder = new Order(loadedOrder);
        this.generateOrderItemsElements(this.selectedOrder, index);
        GeoHelper.displayMiniMap(this.selectedOrder, [this.minimap], [this.vectorSource], 0);
      }
    });
  }

  addToCart() {
    if (this.selectedOrder) {
      this.storeService.addOrderToStore(this.selectedOrder);
    }
  }

  downloadOrder(event: MouseEvent, id: number) {
    event.stopPropagation();
    event.preventDefault();

    this.apiOrderService.downloadOrder(id).subscribe(link => {
      if (!link) {
        this.snackBar.open(
          'Aucun fichier disponible', 'Ok', {panelClass: 'notification-info'}
        );
      } else if (!(link as IOrderDowloadLink).detail.startsWith('http')) {
        this.snackBar.open(
          (link as IOrderDowloadLink).detail, 'Ok', {panelClass: 'notification-info'}
        );
      } else if ((link as IApiResponseError).error) {
        this.snackBar.open(
          (link as IApiResponseError).message, 'Ok', {panelClass: 'notification-error'}
        );
      } else {
        let filename = 'download.zip';
        try {
          const temp = (link as IOrderDowloadLink).detail.split('/');
          filename = temp[temp.length - 1];
        } catch {

        }

        GeoshopUtils.downloadData((link as IOrderDowloadLink).detail, filename);
      }
    });
  }

  confirmOrder(orderId: number) {
    this.snackBar.open('Pas encore implémenté', 'Ok', {
      panelClass: 'notification-warning'
    });
  }
}
