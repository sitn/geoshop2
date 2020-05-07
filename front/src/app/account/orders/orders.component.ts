import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../../_services/api.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {Order} from '../../_models/IOrder';
import {map, mergeMap, scan, tap, throttleTime} from 'rxjs/operators';
import {MapService} from '../../_services/map.service';
import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import LayerGroup from 'ol/layer/Group';
import View from 'ol/View';
import Projection from 'ol/proj/Projection';
import {fromLonLat} from 'ol/proj';
import {ConfigService} from '../../_services/config.service';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import {defaults} from 'ol/interaction';
import {FormControl} from '@angular/forms';
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';

@Component({
  selector: 'gs2-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {

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
  private currentIndex = 0;

  // Filtering
  orderFilterControl = new FormControl('');

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
      promises.push(this.initializeMinimap(elem));
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
      return;
    }

    const end = this.viewport.getRenderedRange().end;
    const total = this.viewport.getDataLength();

    if (end === total) {
      this.offset.next(offset);
    }
  }

  loadMinimap(index: number, order: Order) {
    const target = `mini-map-${order.id}`;
    console.log('load mini map', index, target);

    const feature = new Feature();
    feature.setGeometry(order.geom);
    this.vectorSources[index].clear();
    this.vectorSources[index].addFeature(feature);

    this.minimaps[index].setTarget(target);
    this.minimaps[index].render();
    this.minimaps[index].getView().fit(order.geom, {
      padding: [50, 50, 50, 50]
    });
  }

  private async initializeMinimap(elem: HTMLDivElement) {
    if (!this.mapService.FirstBaseMapLayer) {
      proj4.defs(this.configService.config.epsg,
        '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333'
        + ' +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel '
        + '+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs');
      register(proj4);
    }

    const vectorSource = new VectorSource();
    const layer = new VectorLayer({
      source: vectorSource,
      style: this.mapService.drawingStyle
    });

    const projection = new Projection({
      code: this.configService.config.epsg,
      // @ts-ignore
      extent: this.configService.config.initialExtent,
    });
    const view = new View({
      projection,
      center: fromLonLat([6.80, 47.05], projection),
      zoom: 4,
    });

    const baseMapConfig = this.configService.config.basemaps[0];
    const tileLayer = await this.mapService.createTileLayer(baseMapConfig, true);

    const minimap = new Map({
      layers: new LayerGroup({layers: [tileLayer]}),
      view,
      target: elem,
      interactions: defaults({
        keyboard: false,
        mouseWheelZoom: false,
        dragPan: false,
        altShiftDragRotate: false,
        shiftDragZoom: false,
        doubleClickZoom: false,
        pinchZoom: false,
      }),
    });

    minimap.addLayer(layer);

    return {minimap, vectorSource};
  }

  private initializeComponentAction() {
    const batchMap = this.offset.pipe(
      throttleTime(500),
      mergeMap((n: number) => this.getBatch(n)),
      scan((acc, batch) => {
        return {...acc, ...batch};
      }, {})
    );

    this.infinite = batchMap.pipe(map(x => Object.values(x)));
    this.infinite.subscribe(orders => {
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

      setTimeout(() => {
        let batchIndex = 0;
        for (let i = this.ordersToDisplay.start; i < this.ordersToDisplay.end; i++) {
          this.loadMinimap(batchIndex, orders[i]);
          batchIndex++;
        }
      }, 50);
    });
  }
}
