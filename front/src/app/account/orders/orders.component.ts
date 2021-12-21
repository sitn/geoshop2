import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {BehaviorSubject, merge, of, Subject, Subscription} from 'rxjs';
import {IOrderSummary, Order} from '../../_models/IOrder';
import {debounceTime, filter, map, mergeMap, scan, skip, switchMap, takeUntil, tap} from 'rxjs/operators';
import {MapService} from '../../_services/map.service';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import {ConfigService} from '../../_services/config.service';
import {FormControl} from '@angular/forms';
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {GeoHelper} from '../../_helpers/geoHelper';
import {ApiOrderService} from '../../_services/api-order.service';
import {ApiService} from '../../_services/api.service';
import {GeoshopUtils} from '../../_helpers/GeoshopUtils';
import {select, Store} from '@ngrx/store';
import {selectOrder} from '../../_store';
import {deleteOrder} from '../../_store/cart/cart.action';
import Geometry from 'ol/geom/Geometry';


@Component({
  selector: 'gs2-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
})
export class OrdersComponent implements OnInit, OnDestroy {

  private currentIndex = 0;
  private onDestroy$ = new Subject<boolean>();
  private orderInCart: Order;

  // Infinity scrolling
  @ViewChild(CdkVirtualScrollViewport) viewport: CdkVirtualScrollViewport;
  batch = 10;
  realBatch = 10;
  offset = new BehaviorSubject<number | null>(0);
  currentOrders: IOrderSummary[] = [];
  total = 0;
  stepToLoadData = 0;
  readonly itemHeight = 48;
  private subscription: Subscription;

  // Map
  minimap: Map;
  vectorSource: VectorSource<Geometry>;

  // Filtering
  orderFilterControl = new FormControl('');
  isSearchLoading$ = new BehaviorSubject(true);

  constructor(private apiOrderService: ApiOrderService,
              private apiService: ApiService,
              private mapService: MapService,
              private configService: ConfigService,
              private elRef: ElementRef,
              private store: Store,
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

    this.store.pipe(
      takeUntil(this.onDestroy$),
      select(selectOrder),
      switchMap(x => this.apiOrderService.getFullOrder(x)),
    ).subscribe(order => {
      if (order) {
        this.orderInCart = order;
      }
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
  }

  refreshOrders(orderId: number | null) {
    if (this.orderInCart && this.orderInCart.id === orderId) {
      this.store.dispatch(deleteOrder());
    }

    this.subscription.unsubscribe();
    this.initializeComponentAction();
  }

  getBatch(offset: number) {
    const init: { [key: string]: IOrderSummary } = {};

    return this.apiOrderService.getOrders(offset, this.batch, '-id')
      .pipe(
        tap(response => this.total = response ? response.count : 0),
        map((response) => {
          if (response) {
            return response.results
              .map(p => {
                p.statusAsReadableIconText = Order.initializeStatus(p);
                p.id = GeoshopUtils.ExtractIdFromUrl(p.url);
                return p;
              });
          } else {
            return [];
          }
        }),
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

    this.subscription = merge(
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
              this.total = response ? response.count : 0;
              return response ?
                response.results.map(x => {
                  x.statusAsReadableIconText = Order.initializeStatus(x);
                  x.id = GeoshopUtils.ExtractIdFromUrl(x.url);
                  return x;
                }) :
                [];
            }),
          );
        })
      )
    ).subscribe(orders => {
      this.currentOrders = orders;
      this.isSearchLoading$.next(false);
    });
  }
}
