import {Component, DoCheck, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../../_services/api.service';
import {BehaviorSubject, forkJoin, merge, Observable} from 'rxjs';
import {IOrder, Order} from '../../_models/IOrder';
import {concatMap, debounceTime, map, mergeMap, scan, skip, switchMap, tap, throttleTime} from 'rxjs/operators';
import {MapService} from '../../_services/map.service';
import Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import {ConfigService} from '../../_services/config.service';
import {FormControl} from '@angular/forms';
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {GeoHelper} from '../../_helpers/geoHelper';

@Component({
  selector: 'gs2-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, DoCheck {

  // Infinity scrolling
  @ViewChild(CdkVirtualScrollViewport) viewport: CdkVirtualScrollViewport;
  batch = 10;
  realBatch = 10;
  offset = new BehaviorSubject<number | null>(null);
  infinite: Observable<Order[]>;
  total = 0;
  stepToLoadData = 0;
  readonly itemHeight = 502.4;
  minimaps: Map[];
  private vectorSources: VectorSource[];
  private ordersToDisplay = {start: 0, end: 0};
  private lastOrdersToDisplay = {start: 0, end: 0};
  private currentIndex = 0;
  private currentOrders: Order[] = [];
  private lastOrdersLength = 0;

  // Filtering
  orderFilterControl = new FormControl('');
  isSearchLoading$ = new BehaviorSubject(false);

  constructor(private apiService: ApiService, private mapService: MapService, private configService: ConfigService,
              private elRef: ElementRef
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
    console.log('batch', this.batch);
    this.minimaps = new Array(this.batch);
    this.vectorSources = new Array(this.batch);

    const promises = [];
    for (let i = 0; i < this.batch; i++) {
      const elem = document.createElement('div');
      elem.setAttribute('id', `minimap${i}`);
      this.elRef.nativeElement.appendChild(elem);
      promises.push(GeoHelper.generateMiniMap(this.configService, this.mapService));
    }

    Promise.all(promises).then((results) => {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        this.minimaps[i] = result.minimap;
        this.vectorSources[i] = result.vectorSource;
      }

      this.initializeComponentAction();
    });
  }

  ngDoCheck(): void {
    if (this.currentOrders.length !== this.lastOrdersLength) {
      this.updateMinimaps();
      this.lastOrdersLength = this.currentOrders.length;
    } else if (this.lastOrdersToDisplay.start !== this.ordersToDisplay.start &&
      this.lastOrdersToDisplay.end !== this.ordersToDisplay.end) {
      this.updateMinimaps();
      this.lastOrdersToDisplay.start = this.ordersToDisplay.start;
      this.lastOrdersToDisplay.end = this.ordersToDisplay.end;
    }
  }

  getBatch(offset: number) {
    console.log(`get batch: offset : ${offset}, number : ${this.batch}`);
    return this.apiService.getOrders(offset, this.batch)
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
    console.log('next batch', e);
    this.currentIndex = e;
    if (offset + 1 >= this.total) {
      /*if (this.orderFilterControl.value && this.orderFilterControl.value.length > 0) {
        this.updateMinimaps();
      }*/
      return;
    }

    const end = this.viewport.getRenderedRange().end;
    const total = this.viewport.getDataLength();

    if (end === total) {
      this.offset.next(offset);
    }
  }

  private initializeComponentAction() {

    const batchMap = this.offset.pipe(
      throttleTime(500),
      mergeMap((n: number) => this.getBatch(n)),
      scan((acc, batch) => {
        return {...acc, ...batch};
      }, {})
    );

    this.infinite = merge(
      batchMap.pipe(map(v => Object.values(v) as Order[])),
      this.orderFilterControl.valueChanges.pipe(
        skip(1),
        debounceTime(500),
        throttleTime(500),
        switchMap(inputText => {
          this.isSearchLoading$.next(true);

          if (!inputText || inputText.length < 3) {
            return this.apiService.getOrders(0, this.batch)
              .pipe(
                map((response) => {
                  this.total = response.count;
                  return response.results;
                })
              );

          }

          return this.apiService.find<IOrder>(inputText, 'order').pipe(
            concatMap(response => {
              this.total = response.count;
              return forkJoin(response.results.map(x => this.apiService.getOrder(x.url))).pipe(
                map(iOrders => iOrders.map(x => new Order(x)))
              );
            }),
          );
        })
      )
    ).pipe(
      throttleTime(500)
    );

    this.infinite.subscribe(orders => {
      this.currentOrders = orders;
      this.isSearchLoading$.next(false);
    });
  }

  private updateMinimaps() {
    if (this.viewport) {
      const half = Math.round((this.currentIndex * this.realBatch) / 2);
      this.ordersToDisplay.start = this.currentIndex * this.realBatch - half;
      this.ordersToDisplay.end = (this.currentIndex * this.realBatch) + half;
    } else {
      this.ordersToDisplay.start = 0;
      this.ordersToDisplay.end = this.realBatch;
    }

    if (this.ordersToDisplay.end === 0) {
      this.ordersToDisplay.end = this.realBatch;
    }

    if ((this.ordersToDisplay.end - this.ordersToDisplay.start) > this.realBatch) {
      this.ordersToDisplay.end = this.ordersToDisplay.start +
        (this.ordersToDisplay.end / this.realBatch > 0 ? this.realBatch : this.realBatch - 1);
    }

    console.log('orders to display', this.ordersToDisplay);

    let batchIndex = 0;
    for (let i = this.ordersToDisplay.start; i < this.ordersToDisplay.end; i++) {
      GeoHelper.displayMiniMap(this.currentOrders[i], this.minimaps, this.vectorSources, batchIndex);
      batchIndex++;
    }
  }
}
