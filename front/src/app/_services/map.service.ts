import {Injectable} from '@angular/core';
import {ConfigService} from 'src/app/_services/config.service';
import {MatSnackBar} from '@angular/material/snack-bar';

// Openlayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import BaseLayer from 'ol/layer/Base';
import XYZ from 'ol/source/XYZ';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import ScaleLine from 'ol/control/ScaleLine';
// @ts-ignore
import Geocoder from 'ol-geocoder/dist/ol-geocoder.js';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {Draw, Modify} from 'ol/interaction';
import GeometryType from 'ol/geom/GeometryType';
import {Feature} from 'ol';
import Geolocation from 'ol/Geolocation';
import {BehaviorSubject} from 'rxjs';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import Point from 'ol/geom/Point';
import DragPan from 'ol/interaction/DragPan';
import {GeoHelper} from '../_helpers/geoHelper';
import Polygon from 'ol/geom/Polygon';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private initialized = false;

  private view: View;
  private map: Map;
  private basemapLayers: Array<BaseLayer> = [];
  private baseMapLayerGroup: LayerGroup;

  // Drawing
  private isDrawModeActivated = false;
  private drawingSource: VectorSource;
  private drawingLayer: VectorLayer;
  private modifyInteraction: Modify;
  private drawInteraction: Draw;
  private featureFromDrawing: Feature;

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

  constructor(private configService: ConfigService, private snackBar: MatSnackBar) {
  }

  public cloneView() {
    return new View({
      center: [771815.10, 5942074.07],
      zoom: 10,
    });
  }

  public initialize() {
    if (this.initialized) {
      this.isMapLoading$.next(false);
      this.map.dispose();
      // @ts-ignore
      this.map = null;
    }
    this.initializeMap();
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
  }

  public toggleTracking() {
    this.isMapLoading$.next(true);
    this.isTracking = !this.isTracking;
    this.geolocation.setTracking(this.isTracking);
  }

  public switchBaseMap(gsId: number) {

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

  private initializeMap() {
    this.initializeView();

    const layers: any[] = [];
    this.generateBasemapLayersFromConfig(layers);

    // Create the map
    this.map = new Map({
      target: 'map',
      view: this.view,
      layers,
      controls: [
        new ScaleLine({
          target: 'ol-scaleline',
          className: 'my-scale-line'
        })
      ]
    });
    this.map.on('rendercomplete', () => this.map_renderCompleteExecuted);
    this.map.on('change', () => this.isMapLoading$.next(true));

    this.initializeGeocoder();
    this.initializeDrawing();
    this.initializeGeolocation();
    this.initializeDragInteraction();

    this.initialized = true;
  }

  /* Base Map Managment */
  public generateBasemapLayersFromConfig(layers: Array<BaseLayer>) {

    let isVisible = true;  // -> display the first one

    for (const basemap of this.configService.config.basemaps) {
      if (basemap.url && basemap.gisServiceType === 'xyz') {

        const baseMapXYZ = {url: basemap.url};

        const xyzSource = new XYZ(baseMapXYZ);
        const tileLayer = new TileLayer({
          source: xyzSource,
          visible: isVisible,
        });

        tileLayer.set('gsId', basemap.id);
        tileLayer.set('label', basemap.label);
        tileLayer.set('thumbnail', basemap.thumbUrl);

        this.basemapLayers.push(tileLayer);
        isVisible = false;
      }
    }

    this.baseMapLayerGroup = new LayerGroup({
      layers: this.basemapLayers,
    });

    layers.push(this.baseMapLayerGroup);
  }

  private initializeView() {
    this.view = new View({
      center: [771815.10, 5942074.07],
      zoom: 10,
    });
  }

  private initializeGeocoder() {
    const geocoder = new Geocoder('nominatim', {
      provider: 'osm',
      lang: 'fr-CH',
      placeholder: 'Rechercher une commune, etc.',
      targetType: 'text-input',
      limit: 5,
      keepOpen: false,
      autoComplete: true,
      autoCompleteMinLength: 3,
      preventDefault: true
    });
    geocoder.on('addresschosen', (event: any) => {
      const resolutionForZoom = this.view.getResolutionForZoom(0);
      const extent: any = [
        event.coordinate[0] - (0.1 * resolutionForZoom),
        event.coordinate[1] - (0.1 * resolutionForZoom),
        event.coordinate[0] + (0.1 * resolutionForZoom),
        event.coordinate[1] + (0.1 * resolutionForZoom),
      ];
      this.view.fit(extent);
    });
    this.map.addControl(geocoder);
  }

  private initializeDrawing() {
    this.drawingSource = new VectorSource({
      useSpatialIndex: false,
    });
    if (this.featureFromDrawing) {
      this.drawingSource.addFeature(this.featureFromDrawing);
    }
    this.drawingSource.on('addfeature', (evt) => {
      console.log('addfeature');
      this.featureFromDrawing = evt.feature;
      this.drawInteraction.setActive(false);
      this.setAreaToCurrentFeature();
    });
    this.drawingLayer = new VectorLayer({
      source: this.drawingSource
    });

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
    this.displayAreaMessage(area);
  }

  private displayAreaMessage(area: string) {
    this.snackBar.open(`L'aire du polygone sélectionné est de ${area}`, 'Cancel', {
      duration: 10000,
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
      projection: this.view.getProjection()
    });
    this.geolocation.on('change:position', () => {
      const firstLoad = this.positionFeature.getGeometry() == null;
      const coordinates = this.geolocation.getPosition();
      this.positionFeature.setGeometry(coordinates ? new Point(coordinates) : undefined);
      if (firstLoad) {
        this.view.animate(
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
      this.snackBar.open(error.message, 'Fermer');
      this.isMapLoading$.next(false);
    });
  }

  private map_renderCompleteExecuted() {
    this.isMapLoading$.next(false);
  }
}
