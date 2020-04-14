import {AfterViewInit, Component, OnInit} from '@angular/core';
import {ApiService} from '../../_services/api.service';
import {Observable} from 'rxjs';
import {Order} from '../../_models/IOrder';
import {map} from 'rxjs/operators';
import {MapService} from '../../_services/map.service';
import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Polygon from 'ol/geom/Polygon';
import Feature from 'ol/Feature';
import LayerGroup from 'ol/layer/Group';
import {defaults as defaultInteractions} from 'ol/interaction';
import View from 'ol/View';

@Component({
  selector: 'gs2-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, AfterViewInit {

  miniMaps: {
    [prop: string]: {
      geometry: Polygon,
      map: Map
    }
  } = {};

  order$: Observable<Order[]> = this.apiService.getOrders(0, 10).pipe(
    map(x => x.results.sort((a, b) => a.status === 'PENDING' ? 1 : a.status === 'DONE' ? 1 : 0).map(p => new Order(p)))
  );

  constructor(private apiService: ApiService, private mapService: MapService) {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.order$.subscribe(orders => {
      for (const order of orders) {
        this.loadMinimap(`mini-map-${order.id}`, order.geometry);
      }

      setTimeout(() => {
        Object.keys(this.miniMaps).forEach(item => {
          if (this.miniMaps[item]) {
            this.miniMaps[item].map.getView().fit(this.miniMaps[item].geometry, {
              padding: [20, 20, 20, 20],
            });
          }
        });
      }, 100);
    });
  }

  loadMinimap(target: string, geometry: Polygon) {
    const feature = new Feature();
    feature.setGeometry(geometry);
    const source = new VectorSource();
    source.addFeature(feature);
    const layer = new VectorLayer({
      source
    });

    const baseMapLayers: LayerGroup[] = [];
    this.mapService.generateBasemapLayersFromConfig(baseMapLayers);
    const bLayer = baseMapLayers[0].getLayers().item(0);

    const minimap = new Map({
      layers: [bLayer, layer],
      view: new View({
        center: [0, 0],
        zoom: 1
      }),
      target,
      interactions: defaultInteractions({
        keyboard: false,
        mouseWheelZoom: false,
        dragPan: false,
        altShiftDragRotate: false,
        shiftDragZoom: false,
        doubleClickZoom: false,
        pinchZoom: false,
      }),
    });

    this.miniMaps[target] = {
      geometry,
      map: minimap
    };
  }
}
