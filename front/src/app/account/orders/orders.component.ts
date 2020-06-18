import {Component, ComponentFactoryResolver, ElementRef, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {BehaviorSubject, forkJoin, merge, of} from 'rxjs';
import {IOrder, Order} from '../../_models/IOrder';
import {concatMap, debounceTime, filter, map, mergeMap, scan, skip, switchMap, tap} from 'rxjs/operators';
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
  currentOrders: Order[] = [];
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
              private storeService: StoreService
  ) {
    console.log('constructor');
  }

  ngOnInit(): void {
    console.log('ngOnInit');
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
    console.log(`get batch: offset : ${offset}, number : ${this.batch}`);
    return this.apiOrderService.getOrders(offset, this.batch)
      .pipe(
        tap(response => this.total = response.count),
        map((response) =>
          response.results.sort((a) => a.status === 'PENDING' ? 1 : a.status === 'DONE' ? 1 : 0).map(p => p)
        ),
        map(arr => {
          return arr.reduce((acc, cur) => {
            const id = cur.url;
            return {...acc, [id]: cur};
          }, {});
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

    console.log('initializeComponentAction');

    const batchMap = this.offset.pipe(
      filter((x) => x != null && x >= 0),
      mergeMap((n: number) => this.getBatch(n)),
      scan((acc, batch) => {
        return {...acc, ...batch};
      }, {}),
      map(v => Object.values(v).map((x: IOrder) => new Order(x)))
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

          return this.apiService.find<IOrder>(inputText, 'order').pipe(
            concatMap(response => {
              this.total = response.count;
              return forkJoin(response.results.map(x => this.apiOrderService.getOrder(x.url))).pipe(
                map(iOrders => iOrders.map(x => new Order(x)))
              );
            }),
          );
        })
      )
    ).subscribe(orders => {
      console.log('Get orders result', orders.length);
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

  displayMiniMap(order: Order, index: number) {
    this.apiOrderService.getOrder(order.url).subscribe((iOrder) => {
      this.selectedOrder = new Order(iOrder);
      this.generateOrderItemsElements(this.selectedOrder, index);
      GeoHelper.displayMiniMap(this.selectedOrder, [this.minimap], [this.vectorSource], 0);
    });
  }

  addToCart() {
    if (this.selectedOrder) {
      this.storeService.addOrderToStore(this.selectedOrder);
    }
  }
}
