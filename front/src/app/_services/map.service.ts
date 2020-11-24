import {ElementRef, Injectable} from '@angular/core';
import {ConfigService} from 'src/app/_services/config.service';
import {MatSnackBar, MatSnackBarRef, SimpleSnackBar} from '@angular/material/snack-bar';

// Openlayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import ScaleLine from 'ol/control/ScaleLine';
import {defaults as defaultInteractions, DragAndDrop} from 'ol/interaction';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {Draw, Modify} from 'ol/interaction';
import GeometryType from 'ol/geom/GeometryType';
import {Feature} from 'ol';
import Geolocation from 'ol/Geolocation';
import Polygon, {fromExtent} from 'ol/geom/Polygon';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS';
import {register} from 'ol/proj/proj4';
import DragPan from 'ol/interaction/DragPan';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import Point from 'ol/geom/Point';
import GeoJSON from 'ol/format/GeoJSON';
import Projection from 'ol/proj/Projection';
import {boundingExtent, buffer, Extent, getArea} from 'ol/extent';
import MultiPoint from 'ol/geom/MultiPoint';
import {fromLonLat} from 'ol/proj';
import KML from 'ol/format/KML';
import {Coordinate} from 'ol/coordinate';

// @ts-ignore
import Geocoder from 'ol-geocoder/dist/ol-geocoder.js';

import {BehaviorSubject, of} from 'rxjs';
import {GeoHelper} from '../_helpers/geoHelper';
import proj4 from 'proj4';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {IBasemap, IPageFormat} from '../_models/IConfig';
import {AppState, selectOrder} from '../_store';
import {Store} from '@ngrx/store';
import {updateOrder} from '../_store/cart/cart.action';
import {DragAndDropEvent} from 'ol/interaction/DragAndDrop';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private initialized = false;
  private geoJsonFormatter = new GeoJSON();
  private snackBarRef: MatSnackBarRef<SimpleSnackBar>;

  private map: Map;
  private basemapLayers: Array<BaseLayer> = [];
  private capabilities: any;

  // Drawing
  private isDrawModeActivated = false;
  private drawingSource: VectorSource;
  private geocoderSource: VectorSource;
  private drawingLayer: VectorLayer;
  private modifyInteraction: Modify;
  private drawInteraction: Draw;
  private featureFromDrawing: Feature;
  public readonly drawingStyle = [
    new Style({
      stroke: new Stroke({
        color: 'rgba(38,165,154,1))',
        width: 3
      }),
      fill: new Fill({
        color: 'rgba(38,165,154,0.1)'
      })
    }),
    new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({
          color: 'rgba(38,165,154,1)'
        }),
      }),
      geometry: (feature) => {
        // return the coordinates of the first ring of the polygon
        const geo = feature.getGeometry();
        if (geo && geo instanceof Polygon) {
          const coordinates = geo.getCoordinates()[0];
          return new MultiPoint(coordinates);
        }

        return geo;
      }
    })
  ];

  // Map's interactions
  private dragInteraction: DragPan;

  // Geolocation
  private isTracking = false;
  private geolocation: Geolocation;
  private positionFeature = new Feature();
  private positionLayer: VectorLayer;

  public isTracking$ = new BehaviorSubject<boolean>(false);
  public isMapLoading$ = new BehaviorSubject<boolean>(true);
  public isDrawing$ = new BehaviorSubject<boolean>(false);

  public get Basemaps() {
    return this.configService.config.basemaps;
  }

  public get PageFormats() {
     return this.configService.config.pageformats;
  }

  public get FirstBaseMapLayer() {
    return this.basemapLayers.length > 0 ? this.basemapLayers[0] : null;
  }

  constructor(private configService: ConfigService,
              private store: Store<AppState>,
              private snackBar: MatSnackBar,
              private httpClient: HttpClient) {
  }

  public initialize() {
    if (this.initialized) {
      this.isMapLoading$.next(false);
      this.map.dispose();
      // @ts-ignore
      this.map = null;
    }
    this.initializeMap().then(() => {

      this.initializeDrawing();
      this.initializeGeolocation();
      this.initializeDragInteraction();
      this.store.select(selectOrder).subscribe(order => {
        if (!this.featureFromDrawing && order && order.geom) {
          const geometry = this.geoJsonFormatter.readGeometry(order.geom);
          const feature = new Feature(geometry);
          this.drawingSource.addFeature(feature);
        }
      });

      this.initialized = true;
    }).catch(() => {
      this.initialized = true;
    });
  }

  public toggleDrawing() {
    this.isDrawModeActivated = !this.isDrawModeActivated;
    this.modifyInteraction.setActive(this.isDrawModeActivated);
    this.drawInteraction.setActive(this.isDrawModeActivated);
  }

  public eraseDrawing() {
    console.log(this.drawingSource.getFeatures());
    if (this.featureFromDrawing) {
      this.drawingSource.removeFeature(this.featureFromDrawing);
    }
    this.geocoderSource.clear();

    if (this.snackBarRef) {
      this.snackBarRef.dismiss();
    }

    this.store.dispatch(updateOrder({geom: ''}));
  }

  public toggleTracking() {
    this.isMapLoading$.next(true);
    this.isTracking = !this.isTracking;
    this.geolocation.setTracking(this.isTracking);
  }

  public switchBaseMap(gsId: string) {

    this.map.getLayers().forEach((layerGroup) => {
      if (layerGroup instanceof LayerGroup) {
        layerGroup.getLayers().forEach((layer) => {
          const id = layer.get('gsId');
          if (id && id === gsId) {
            layer.setVisible(true);
          } else {
            layer.setVisible(false);
          }
        });
      } else {
        const id = layerGroup.get('gsId');
        if (!id) {
          return;
        }
        if (id && id === gsId) {
          layerGroup.setVisible(true);
        } else {
          layerGroup.setVisible(false);
        }
      }
    });

  }

  public resizeMap() {
    this.map.updateSize();
  }

  public async createTileLayer(baseMapConfig: IBasemap, isVisible: boolean): Promise<TileLayer> {
    if (!this.capabilities) {
      await this.loadCapabilities();
    }

    const options = optionsFromCapabilities(this.capabilities, {
      layer: baseMapConfig.id,
      matrixSet: baseMapConfig.matrixSet,
    });
    const source = new WMTS(options);
    const tileLayer = new TileLayer({
      source,
      visible: isVisible,
    });
    tileLayer.set('gsId', baseMapConfig.id);
    tileLayer.set('label', baseMapConfig.label);
    tileLayer.set('thumbnail', baseMapConfig.thumbUrl);

    return tileLayer;
  }

  private async loadCapabilities() {
    if (!this.capabilities) {
      const response = await fetch(this.configService.config.baseMapCapabilitiesUrl);
      const parser = new WMTSCapabilities();
      this.capabilities = parser.read(await response.text());
    }
  }

  public geocoderSearch(inputText: string) {
    if (!inputText || inputText.length === 0 || typeof inputText !== 'string') {
      return of([]);
    }
    const url = new URL(this.configService.config.geocoderUrl);
    url.searchParams.append('partitionlimit', '10');
    url.searchParams.append('query', inputText);
    return this.httpClient.get(url.toString()).pipe(
      map(featureCollection => this.geoJsonFormatter.readFeatures(featureCollection))
    );
  }

  public addFeatureFromGeocoderToDrawing(feature: Feature) {
    this.geocoderSource.clear();
    if (this.featureFromDrawing) {
      this.drawingSource.removeFeature(this.featureFromDrawing);
    }
    this.geocoderSource.addFeature(feature.clone());

    let bufferExtent: Extent;
    const geometry = feature.getGeometry();
    if (geometry instanceof Point) {
      const text = boundingExtent([geometry.getCoordinates()]);
      const bv = 50;
      bufferExtent = buffer(text, bv);
    } else {
      const originalExtent = feature.getGeometry().getExtent();
      const area = getArea(originalExtent);
      const bufferValue = area * 0.001;
      bufferExtent = buffer(originalExtent, bufferValue);
    }

    const poly = fromExtent(bufferExtent);
    feature.setGeometry(poly);
    this.drawingSource.addFeature(feature);
    this.modifyInteraction.setActive(true);

    this.map.getView().fit(poly, {
      padding: [100, 100, 100, 100]
    });
  }

  private async initializeMap() {
    proj4.defs(this.configService.config.epsg,
      '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333'
      + ' +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel '
      + '+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs');
    register(proj4);

    const projection = new Projection({
      code: this.configService.config.epsg,
      // @ts-ignore
      extent: this.configService.config.initialExtent,
    });

    const baseLayers = await this.generateBasemapLayersFromConfig();
    const view = new View({
      projection,
      center: fromLonLat([6.80, 47.05], projection),
      zoom: 4,
    });

    // Create the map
    this.map = new Map({
      target: 'map',
      view,
      layers: new LayerGroup({
        layers: baseLayers
      }),
      interactions: defaultInteractions(
        {doubleClickZoom: false}
      ).extend([this.initializeDragAndDropInteraction()]),
      controls: [
        new ScaleLine({
          target: 'ol-scaleline',
          className: 'my-scale-line',
          units: 'metric',
        })
      ]
    });

    this.map.on('rendercomplete', () => this.map_renderCompleteExecuted);
    this.map.on('change', () => this.isMapLoading$.next(true));
  }

  /* Base Map Managment */
  public async generateBasemapLayersFromConfig() {
    let isVisible = true;  // -> display the first one

    try {
      for (const baseMapConfig of this.configService.config.basemaps) {
        const tileLayer = await this.createTileLayer(baseMapConfig, isVisible);
        this.basemapLayers.push(tileLayer);
        isVisible = false;
      }
    } catch (error) {
      console.error(error);
      this.snackBarRef = this.snackBar.open('Impossible de charger les fonds de plans.', 'Ok', {
        duration: 10000,
        panelClass: 'primary-container'
      });
    }

    return this.basemapLayers;
  }

  private initializeDragAndDropInteraction() {
    // @ts-ignore
    const dragAndDropInteraction = new DragAndDrop({
      formatConstructors: [
        KML
      ]
    });

    dragAndDropInteraction.on('addfeatures', (event: DragAndDropEvent) => {
      console.log(event);

      if (!event.file.name.endsWith('kml') || event.features.length === 0) {
        this.snackBar.open(`Le fichier "${event.file.name}" ne contient aucune donnée exploitable. Le format supporté est le "kml".`, 'Ok', {
          panelClass: 'notification-info'
        });

        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.features.length > 0) {
        const feature = new Feature(event.features[0].getGeometry());
        this.addFeatureFromGeocoderToDrawing(feature);
      }

    });

    return dragAndDropInteraction;
  }

  private initializeDrawing() {
    this.drawingSource = new VectorSource({
      useSpatialIndex: false,
    });
    this.geocoderSource = new VectorSource({
      useSpatialIndex: false
    });
    if (this.featureFromDrawing) {
      this.drawingSource.addFeature(this.featureFromDrawing);
    }
    this.drawingSource.on('addfeature', (evt) => {
      console.log('addfeature');
      this.featureFromDrawing = evt.feature;
      this.drawInteraction.setActive(false);
      this.setAreaToCurrentFeature();

      console.log(this.geoJsonFormatter.writeGeometry(this.featureFromDrawing.getGeometry()));
    });
    this.drawingLayer = new VectorLayer({
      source: this.drawingSource,
      style: this.drawingStyle
    });

    const geocoderLayer = new VectorLayer({
      source: this.geocoderSource,
      style: [
        new Style({
          stroke: new Stroke({width: 2, color: 'rgba(255, 235, 59, 1)'}),
          fill: new Fill({color: 'rgba(255, 235, 59, 0.85)'})
        }),
        new Style({
          image: new CircleStyle({
            radius: 20,
            fill: new Fill({color: 'rgba(255, 235, 59, 1)'})
          })
        })
      ]
    });
    this.map.addLayer(geocoderLayer);
    this.map.addLayer(this.drawingLayer);

    this.modifyInteraction = new Modify({
      source: this.drawingSource
    });
    this.drawInteraction = new Draw({
      source: this.drawingSource,
      type: GeometryType.POLYGON,
      finishCondition: (evt) => {
        console.log('finish Condition', evt);
        return true;
      }
    });

    this.drawInteraction.on('change:active', () => {
      const isActive = this.drawInteraction.getActive();

      if (this.featureFromDrawing && isActive && this.drawingSource.getFeatures().length > 0) {
        this.drawingSource.removeFeature(this.featureFromDrawing);
      }
      this.geocoderSource.clear();
      this.toggleDragInteraction(!isActive);

      this.isDrawModeActivated = isActive;
      this.isDrawing$.next(isActive);

      if (isActive) {
        window.oncontextmenu = (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          this.drawInteraction.finishDrawing();
          window.oncontextmenu = null;
        };
      }
    });

    this.modifyInteraction.on('modifyend', (evt) => {
      this.featureFromDrawing = evt.features.item(0);
      this.setAreaToCurrentFeature();
    });

    this.map.addInteraction(this.modifyInteraction);
    this.map.addInteraction(this.drawInteraction);

    this.modifyInteraction.setActive(false);
    this.drawInteraction.setActive(false);
  }

  private setAreaToCurrentFeature() {
    const area = GeoHelper.formatArea(this.featureFromDrawing.getGeometry() as Polygon);
    this.featureFromDrawing.set('area', area);
    this.store.dispatch(updateOrder({geom: this.geoJsonFormatter.writeGeometry(this.featureFromDrawing.getGeometry())}));
    // this.displayAreaMessage(area);
  }

  private displayAreaMessage(area: string) {
    this.snackBarRef = this.snackBar.open(`L'aire du polygone sélectionné est de ${area}`, 'Cancel', {
      duration: 5000,
      panelClass: 'primary-container'
    });
  }

  private toggleDragInteraction(isActive: boolean) {
    if (this.dragInteraction) {
      this.dragInteraction.setActive(isActive);
    }
  }

  private initializeDragInteraction() {
    if (!this.dragInteraction) {
      this.map.getInteractions().forEach(interaction => {
        if (interaction instanceof DragPan) {
          this.dragInteraction = interaction;
          return;
        }
      });
    }
  }

  private initializeGeolocation() {
    this.positionFeature.setStyle(new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({
          color: '#3399CC'
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 2
        })
      })
    }));
    this.positionLayer = new VectorLayer({
      map: this.map,
      source: new VectorSource({
        features: [this.positionFeature]
      })
    });
    this.geolocation = new Geolocation({
      trackingOptions: {
        enableHighAccuracy: true
      },
      projection: this.map.getView().getProjection()
    });
    this.geolocation.on('change:position', () => {
      const firstLoad = this.positionFeature.getGeometry() == null;
      const coordinates = this.geolocation.getPosition();
      this.positionFeature.setGeometry(coordinates ? new Point(coordinates) : undefined);
      if (firstLoad) {
        this.map.getView().animate(
          {zoom: 10},
          {center: coordinates},
          {duration: 200}
        );
      }
      this.isMapLoading$.next(false);
    });
    this.geolocation.on('change:tracking', () => {
      this.isTracking$.next(this.geolocation.getTracking());
      this.isTracking = this.geolocation.getTracking();
      if (!this.isTracking) {
        this.positionFeature.setGeometry(undefined);
      }
    });
    this.geolocation.on('error', (error: Error) => {
      this.snackBarRef = this.snackBar.open(error.message, 'Fermer');
      this.isMapLoading$.next(false);
    });
  }

  private map_renderCompleteExecuted() {
    this.isMapLoading$.next(false);
  }
  public setPageFormat(format: IPageFormat, scale: number, rotation: number) {

    if (this.featureFromDrawing) {
      this.drawingSource.removeFeature(this.featureFromDrawing);
    }
    this.geocoderSource.clear();

    const center = this.map.getView().getCenter();
    const units = this.map.getView().getProjection().getUnits();

    const INCHES_PER_METER_UNIT = 39.37;
    const PI = 3.14159265359 ;
    const w = format.width / 72 / INCHES_PER_METER_UNIT * scale / 2;
    const h = format.height / 72 / INCHES_PER_METER_UNIT * scale / 2;
    const coordinates: Array<Array<Coordinate>> = [[
      [center[0] - w, center[1] - h], 
      [center[0] - w, center[1] + h],
      [center[0] + w, center[1] + h],
      [center[0] + w, center[1] - h]
    ]]
    let poly = new Polygon(coordinates);
    poly.rotate(rotation*PI/180, center);

    const feature = new Feature({
      geometry: poly
    });
    this.map.getView().fit(poly, {nearest: true});
    this.drawingSource.addFeature(feature);
    this.featureFromDrawing.set('area', poly);
  }
}
