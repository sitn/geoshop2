import { Injectable } from '@angular/core';
import { ConfigService } from 'src/app/_services/config.service';
import { MatLegacySnackBar as MatSnackBar, MatLegacySnackBarRef as MatSnackBarRef, LegacySimpleSnackBar as SimpleSnackBar } from '@angular/material/legacy-snack-bar';

// Openlayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import ScaleLine from 'ol/control/ScaleLine';
import { defaults as defaultInteractions, DragAndDrop } from 'ol/interaction';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Draw, Modify } from 'ol/interaction';
import { Feature } from 'ol';
import { FeatureLike } from 'ol/Feature';
import Polygon, { fromExtent } from 'ol/geom/Polygon';
import WMTS, {Options} from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import { register } from 'ol/proj/proj4';
import DragPan from 'ol/interaction/DragPan';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import Point from 'ol/geom/Point';
import GeoJSON from 'ol/format/GeoJSON';
import Projection from 'ol/proj/Projection';
import { boundingExtent, buffer, getArea } from 'ol/extent';
import MultiPoint from 'ol/geom/MultiPoint';
import { fromLonLat } from 'ol/proj';
import KML from 'ol/format/KML';
import { Coordinate } from 'ol/coordinate';
import Geometry from 'ol/geom/Geometry';
import TileSource from 'ol/source/Tile';

// ol-ext
// @ts-ignore
import Transform from 'ol-ext/interaction/Transform';

import { BehaviorSubject, of } from 'rxjs';
import { GeoHelper } from '../_helpers/geoHelper';
import proj4 from 'proj4';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { IBasemap, IPageFormat } from '../_models/IConfig';
import { AppState, selectOrder } from '../_store';
import { Store } from '@ngrx/store';
import { updateGeometry } from '../_store/cart/cart.action';
import { DragAndDropEvent } from 'ol/interaction/DragAndDrop';
import { shiftKeyOnly } from 'ol/events/condition';
import { createBox } from 'ol/interaction/Draw';
import { CoordinateSearchService } from './coordinate-search.service';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private initialized = false;
  private geoJsonFormatter = new GeoJSON();
  private snackBarRef: MatSnackBarRef<SimpleSnackBar>;

  private map: Map;
  private basemapLayers: Array<BaseLayer> = [];
  private projection: Projection;
  private resolutions: number[];
  private initialExtent: number[];

  // Drawing
  private transformInteraction: Transform;
  private isDrawModeActivated = false;
  private drawingSource: VectorSource<Geometry>;
  private geocoderSource: VectorSource<Geometry>;
  private drawingLayer: VectorLayer<VectorSource<Geometry>>;
  private modifyInteraction: Modify;
  private drawInteraction: Draw;
  private featureFromDrawing: Feature<Geometry> | null;
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

  public isMapLoading$ = new BehaviorSubject<boolean>(true);
  public isDrawing$ = new BehaviorSubject<boolean>(false);

  public get Basemaps() {
    return this.configService.config?.basemaps;
  }

  public get PageFormats() {
    return this.configService.config?.pageformats;
  }

  public get FirstBaseMapLayer() {
    return this.basemapLayers.length > 0 ? this.basemapLayers[0] : null;
  }

  constructor(
    private configService: ConfigService,
    private coordinateSearchService: CoordinateSearchService,
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
      this.initializeInteraction();
      this.initializeDragInteraction();
      this.initializeDelKey();
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

  public toggleDrawing(drawMode?: string) {
    this.isDrawModeActivated = !this.isDrawModeActivated;
    if (this.isDrawModeActivated) {
      this.createDrawingInteraction(drawMode);
      this.transformInteraction.setActive(false);
      if (this.featureFromDrawing && this.drawingSource.getFeatures().length > 0) {
        this.drawingSource.removeFeature(this.featureFromDrawing);
      }
      window.oncontextmenu = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        this.drawInteraction.finishDrawing();
        window.oncontextmenu = null;
      };
    } else {
      this.geocoderSource.clear();
      this.map.removeInteraction(this.drawInteraction);
    }
    this.toggleDragInteraction(!this.isDrawModeActivated);
    this.isDrawing$.next(this.isDrawModeActivated);
  }

  public eraseDrawing() {
    if (this.featureFromDrawing) {
      this.drawingSource.removeFeature(this.featureFromDrawing);
      this.featureFromDrawing.dispose();
    }

    if (this.geocoderSource) {
      this.geocoderSource.clear();
    }

    if (this.snackBarRef) {
      this.snackBarRef.dismiss();
    }

    if (this.transformInteraction) {
      this.transformInteraction.setActive(false);
    }

    this.featureFromDrawing = null;
    this.store.dispatch(updateGeometry({ geom: '' }));
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

  private debounce(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async createTileLayer(baseMapConfig: IBasemap, isVisible: boolean): Promise<TileLayer<TileSource> | undefined> {
    if (!this.resolutions || !this.initialExtent) {
      this.resolutions = this.configService.config!.resolutions;
      this.initialExtent = this.configService.config!.initialExtent;
      await this.debounce(200);
    }
    const matrixIds = [];
    for (let i = 0; i < this.resolutions.length; i += 1) {
      matrixIds.push(`${i}`);
    }

    const tileGrid = new WMTSTileGrid({
      origin: [this.initialExtent[0], this.initialExtent[3]],
      resolutions: this.resolutions,
      matrixIds: matrixIds
    });

    const options = {
      layer: baseMapConfig.id,
      projection: this.projection,
      url: `${this.configService.config?.baseMapUrl}.${baseMapConfig.format}`,
      tileGrid: tileGrid,
      matrixSet: baseMapConfig.matrixSet,
      style: 'default',
      requestEncoding: 'REST'
    }
    if (options == null) {
      return undefined;
    }
    const source = new WMTS(options as Options);
    const tileLayer = new TileLayer({
      source,
      visible: isVisible,
    });
    tileLayer.set('gsId', baseMapConfig.id);
    tileLayer.set('label', baseMapConfig.label);
    tileLayer.set('thumbnail', baseMapConfig.thumbUrl);

    return tileLayer;
  }

  public geocoderSearch(inputText: string) {
    if (!inputText || inputText.length === 0 || typeof inputText !== 'string') {
      return of([]);
    }
    const coordinateResult = this.coordinateSearchService.stringCoordinatesToFeature(inputText);
    const urlText = this.configService.config?.geocoderUrl;
    if (!urlText) {
      return of([]);
    }
    const url = new URL(urlText);
    url.searchParams.append('query', inputText);
    return this.httpClient.get(url.toString()).pipe(
      map((featureCollectionData) => {
        const featureCollection = this.geoJsonFormatter.readFeatures(featureCollectionData);
        if (coordinateResult) {
          featureCollection.push(coordinateResult);
        }
        return featureCollection;
      })
    );
  }

  /**
   * Sets two geometries on the map based on the feature returned by de geocoder:
   * - The extent as an order perimeter
   * - The feature itself highlighted
   *
   * If the extent of the feature returned by the geocoder is bigger than 1km², typically a cadastre, commune
   * then the order permimeter will be set to the feature itself and not the extent.
   *
   * @param feature - The feature returned by the geocoder
   */
  public addFeatureFromGeocoderToDrawing(feature: Feature<Geometry>) {
    this.geocoderSource.clear();
    if (this.featureFromDrawing) {
      this.drawingSource.removeFeature(this.featureFromDrawing);
    }
    this.geocoderSource.addFeature(feature.clone());

    let poly: Polygon;
    const geometry = feature.getGeometry();
    if (geometry instanceof Point) {
      const text = boundingExtent([geometry.getCoordinates()]);
      const bv = 50;
      poly = fromExtent(buffer(text, bv));
    } else {
      const originalExtent = feature.getGeometry()?.getExtent();
      if (originalExtent) {
        const area = getArea(originalExtent);
        if (geometry instanceof Polygon && area > 1000000) {
          poly = geometry;
        } else {
          const bufferValue = area * 0.001;
          poly = fromExtent(buffer(originalExtent, bufferValue));
        }
        feature.setGeometry(poly);
        this.drawingSource.addFeature(feature);
        this.modifyInteraction.setActive(true);

        this.map.getView().fit(poly, {
          padding: [100, 100, 100, 100]
        });
      }
    }
  }

  private async initializeMap() {
    if (!this.configService.config) {
      console.error('There is no config defined in configService, map will not be initialized.');
      return;
    }
    const EPSG = this.configService.config.epsg || 'EPSG2056';
    proj4.defs(EPSG,
      '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333'
      + ' +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel '
      + '+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs');
    register(proj4);

    this.initialExtent = this.configService.config.initialExtent;
    this.resolutions = this.configService.config.resolutions;
    this.projection = new Projection({
      code: EPSG,
      extent: this.initialExtent,
    });

    const baseLayers = await this.generateBasemapLayersFromConfig();
    const view = new View({
      projection: this.projection,
      center: fromLonLat([6.80, 47.05], this.projection),
      zoom: 2,
      resolutions: this.resolutions,
      constrainResolution: true
    });

    // Create the map
    this.map = new Map({
      target: 'map',
      view,
      layers: new LayerGroup({
        layers: baseLayers
      }),
      interactions: defaultInteractions(
        { doubleClickZoom: false }
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
    let basemaps: IBasemap[] = [];
    if (this.configService.config?.basemaps) {
      basemaps = this.configService.config?.basemaps;
    }
    try {
      for (const baseMapConfig of basemaps) {
        const tileLayer = await this.createTileLayer(baseMapConfig, isVisible);
        if (tileLayer) {
          this.basemapLayers.push(tileLayer);
          isVisible = false;
        }
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

  private addSingleFeatureToDrawingSource(features: FeatureLike[], sourceName: string): boolean {
    if (!sourceName.endsWith('kml') || features.length === 0) {
      this.snackBar.open(`Le fichier "${sourceName}" ne contient aucune donnée exploitable.
      Le format supporté est le "kml".`, 'Ok', {
        panelClass: 'notification-info'
      });
      return false;
    }

    if (features.length > 1) {
      this.snackBar.open(`Le fichier "${sourceName}" contient plusieurs géométries.
      Un seul polygone sera affiché ici.`, 'Ok', {
        panelClass: 'notification-info'
      });
    }

    for (const [i, featureLike] of features.entries()) {
      if (featureLike.getGeometry()?.getType() !== 'Polygon') {
        continue;
      }
      const feature = new Feature(featureLike.getGeometry());
      const geom = feature.getGeometry();
      if (geom) {
        this.map.getView().fit(geom.getExtent(), { nearest: true });
      }
      if (this.featureFromDrawing) {
        this.drawingSource.removeFeature(this.featureFromDrawing);
      }
      this.featureFromDrawing = feature;
      this.drawingSource.addFeature(feature);
      return true;
    }

    this.snackBar.open(`Le fichier "${sourceName}" ne contient aucun polygone valide.`, 'Ok', {
      panelClass: 'notification-error'
    });

    return false;
  }

  private initializeDragAndDropInteraction() {
    const dragAndDropInteraction = new DragAndDrop({
      formatConstructors: [
        KML as any
      ]
    });

    dragAndDropInteraction.on('addfeatures', (event: DragAndDropEvent) => {
      let isDataOk = false;
      if (event.features) {
        isDataOk = this.addSingleFeatureToDrawingSource(event.features, event.file.name);
      }
      if (!isDataOk) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    });

    return dragAndDropInteraction;
  }

  private createDrawingInteraction(drawingMode?: string) {
    if (drawingMode === 'Box') {
      this.drawInteraction = new Draw({
        source: this.drawingSource,
        type: 'Circle',
        geometryFunction: createBox()
      });
    } else {
      this.drawInteraction = new Draw({
        source: this.drawingSource,
        type: 'Polygon',
        finishCondition: (evt) => {
          return true;
        }
      });
    }
    this.drawInteraction.on('drawend', () => {
      this.toggleDrawing();
    });
    this.map.addInteraction(this.drawInteraction);
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
    this.drawingSource.on('addfeature', (evt: { feature: any; }) => {
      this.featureFromDrawing = evt.feature;
      this.dispatchCurrentGeometry(true);

      setTimeout(() => {
        this.transformInteraction.setActive(true);
      }, 500);
    });
    this.drawingLayer = new VectorLayer({
      source: this.drawingSource,
      style: this.drawingStyle
    });

    const geocoderLayer = new VectorLayer({
      source: this.geocoderSource,
      style: [
        new Style({
          stroke: new Stroke({ width: 2, color: 'rgba(255, 235, 59, 1)' }),
          fill: new Fill({ color: 'rgba(255, 235, 59, 0.85)' })
        }),
        new Style({
          image: new CircleStyle({
            radius: 20,
            fill: new Fill({ color: 'rgba(255, 235, 59, 1)' })
          })
        })
      ]
    });
    this.map.addLayer(geocoderLayer);
    this.map.addLayer(this.drawingLayer);

    this.modifyInteraction = new Modify({
      source: this.drawingSource
    });

    this.modifyInteraction.on('modifystart', () => {
      this.transformInteraction.setActive(false);
    });
    this.modifyInteraction.on('modifyend', (evt) => {
      const firstFeature = new Feature(evt.features.item(0)?.getGeometry())
      this.featureFromDrawing = firstFeature;
      this.dispatchCurrentGeometry(false);
      setTimeout(() => {
        this.transformInteraction.setActive(true);
      }, 500);
    });
    this.modifyInteraction.on('change:active', () => {
      const isActive = this.modifyInteraction.getActive();
      if (isActive) {
        this.transformInteraction.setActive(false);
      }
    });

    this.map.addInteraction(this.modifyInteraction);
    this.modifyInteraction.setActive(false);
  }

  private dispatchCurrentGeometry(fitMap: boolean) {
    if (this.featureFromDrawing) {
      const polygon = this.featureFromDrawing.getGeometry() as Polygon;
      const area = GeoHelper.formatArea(polygon);
      this.featureFromDrawing.set('area', area);
      this.store.dispatch(
        updateGeometry(
          {
            geom: this.geoJsonFormatter.writeGeometry(polygon)
          }
        )
      );
      if (fitMap) {
        const extent = this.featureFromDrawing.getGeometry()?.getExtent() || [];
        this.map.getView().fit(extent, {
          padding: [100, 100, 100, 100]
        });
      }
    }
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

  private initializeDelKey() {
    const mapElement = this.map.getTargetElement();
    mapElement.addEventListener('keyup', (e) => {
      if (e.key === 'Delete' && this.drawingSource && this.featureFromDrawing) {
        this.eraseDrawing();
      }
    });
  }

  private initializeInteraction() {
    Transform.prototype.Cursors.rotate = 'url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgdmlld0JveD0iMCAwIDI0IDI0IgogICBmaWxsPSJibGFjayIKICAgd2lkdGg9IjE4cHgiCiAgIGhlaWdodD0iMThweCIKICAgdmVyc2lvbj0iMS4xIgogICBpZD0ic3ZnNiIKICAgc29kaXBvZGk6ZG9jbmFtZT0icm90YXRlX2xlZnQtYmxhY2stMThkcC5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjAuOTIuNCAoNWRhNjg5YzMxMywgMjAxOS0wMS0xNCkiPgogIDxtZXRhZGF0YQogICAgIGlkPSJtZXRhZGF0YTEyIj4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KICA8ZGVmcwogICAgIGlkPSJkZWZzMTAiIC8+CiAgPHNvZGlwb2RpOm5hbWVkdmlldwogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIKICAgICBib3JkZXJvcGFjaXR5PSIxIgogICAgIG9iamVjdHRvbGVyYW5jZT0iMTAiCiAgICAgZ3JpZHRvbGVyYW5jZT0iMTAiCiAgICAgZ3VpZGV0b2xlcmFuY2U9IjEwIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwIgogICAgIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxODIyIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjEwNTEiCiAgICAgaWQ9Im5hbWVkdmlldzgiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGlua3NjYXBlOnpvb209IjEzLjExMTExMSIKICAgICBpbmtzY2FwZTpjeD0iLTcuODE3Nzk2NyIKICAgICBpbmtzY2FwZTpjeT0iOC45OTk5OTk5IgogICAgIGlua3NjYXBlOndpbmRvdy14PSI4OSIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iLTkiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMSIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJzdmc2IiAvPgogIDxwYXRoCiAgICAgZD0iTTAgMGgyNHYyNEgweiIKICAgICBmaWxsPSJub25lIgogICAgIGlkPSJwYXRoMiIgLz4KICA8cGF0aAogICAgIGQ9Ik03LjExIDguNTNMNS43IDcuMTFDNC44IDguMjcgNC4yNCA5LjYxIDQuMDcgMTFoMi4wMmMuMTQtLjg3LjQ5LTEuNzIgMS4wMi0yLjQ3ek02LjA5IDEzSDQuMDdjLjE3IDEuMzkuNzIgMi43MyAxLjYyIDMuODlsMS40MS0xLjQyYy0uNTItLjc1LS44Ny0xLjU5LTEuMDEtMi40N3ptMS4wMSA1LjMyYzEuMTYuOSAyLjUxIDEuNDQgMy45IDEuNjFWMTcuOWMtLjg3LS4xNS0xLjcxLS40OS0yLjQ2LTEuMDNMNy4xIDE4LjMyek0xMyA0LjA3VjFMOC40NSA1LjU1IDEzIDEwVjYuMDljMi44NC40OCA1IDIuOTQgNSA1Ljkxcy0yLjE2IDUuNDMtNSA1LjkxdjIuMDJjMy45NS0uNDkgNy0zLjg1IDctNy45M3MtMy4wNS03LjQ0LTctNy45M3oiCiAgICAgaWQ9InBhdGg0IgogICAgIHN0eWxlPSJmaWxsOiMwMDAwZmY7ZmlsbC1vcGFjaXR5OjEiIC8+Cjwvc3ZnPgo=\') 15 15, auto';
    Transform.prototype.Cursors.translate = 'url(\'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMjQgMjQiCiAgIHZpZXdCb3g9IjAgMCAyNCAyNCIKICAgZmlsbD0iYmxhY2siCiAgIHdpZHRoPSIxOHB4IgogICBoZWlnaHQ9IjE4cHgiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzE0IgogICBzb2RpcG9kaTpkb2NuYW1lPSJ6b29tX291dF9tYXAtYmxhY2stMThkcC5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjAuOTIuNCAoNWRhNjg5YzMxMywgMjAxOS0wMS0xNCkiPgogIDxtZXRhZGF0YQogICAgIGlkPSJtZXRhZGF0YTIwIj4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KICA8ZGVmcwogICAgIGlkPSJkZWZzMTgiIC8+CiAgPHNvZGlwb2RpOm5hbWVkdmlldwogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIKICAgICBib3JkZXJvcGFjaXR5PSIxIgogICAgIG9iamVjdHRvbGVyYW5jZT0iMTAiCiAgICAgZ3JpZHRvbGVyYW5jZT0iMTAiCiAgICAgZ3VpZGV0b2xlcmFuY2U9IjEwIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwIgogICAgIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxODIyIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjEwNTEiCiAgICAgaWQ9Im5hbWVkdmlldzE2IgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp6b29tPSIxMy4xMTExMTEiCiAgICAgaW5rc2NhcGU6Y3g9Ii03LjgxNzc5NjciCiAgICAgaW5rc2NhcGU6Y3k9IjguOTk5OTk5OSIKICAgICBpbmtzY2FwZTp3aW5kb3cteD0iODkiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9Ii05IgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ic3ZnMTQiIC8+CiAgPGcKICAgICBpZD0iZzQiPgogICAgPHJlY3QKICAgICAgIGZpbGw9Im5vbmUiCiAgICAgICBoZWlnaHQ9IjI0IgogICAgICAgd2lkdGg9IjI0IgogICAgICAgaWQ9InJlY3QyIiAvPgogIDwvZz4KICA8ZwogICAgIGlkPSJnMTIiCiAgICAgc3R5bGU9ImZpbGw6IzAwMDBmZjtmaWxsLW9wYWNpdHk6MSI+CiAgICA8ZwogICAgICAgaWQ9ImcxMCIKICAgICAgIHN0eWxlPSJmaWxsOiMwMDAwZmY7ZmlsbC1vcGFjaXR5OjEiPgogICAgICA8ZwogICAgICAgICBpZD0iZzgiCiAgICAgICAgIHN0eWxlPSJmaWxsOiMwMDAwZmY7ZmlsbC1vcGFjaXR5OjEiPgogICAgICAgIDxwYXRoCiAgICAgICAgICAgZD0iTTE1LDNsMi4zLDIuM2wtMi44OSwyLjg3bDEuNDIsMS40MkwxOC43LDYuN0wyMSw5VjNIMTV6IE0zLDlsMi4zLTIuM2wyLjg3LDIuODlsMS40Mi0xLjQyTDYuNyw1LjNMOSwzSDNWOXogTTksMjEgbC0yLjMtMi4zbDIuODktMi44N2wtMS40Mi0xLjQyTDUuMywxNy4zTDMsMTV2Nkg5eiBNMjEsMTVsLTIuMywyLjNsLTIuODctMi44OWwtMS40MiwxLjQybDIuODksMi44N0wxNSwyMWg2VjE1eiIKICAgICAgICAgICBpZD0icGF0aDYiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6IzAwMDBmZjtmaWxsLW9wYWNpdHk6MSIgLz4KICAgICAgPC9nPgogICAgPC9nPgogIDwvZz4KPC9zdmc+Cg==\') 10 10, auto';

    this.transformInteraction = new Transform({
      rotate: true,
      translate: true,
      scale: false,
      translateFeature: false,
      addCondition: shiftKeyOnly,
      enableRotatedTransform: false,
      hitTolerance: 2,
    });

    this.transformInteraction.on(['rotateend', 'translateend'], (evt: any) => {
      this.featureFromDrawing = evt.features.item(0);
      this.dispatchCurrentGeometry(true);
    });

    this.map.addInteraction(this.transformInteraction);

    this.transformInteraction.setActive(false);
  }

  private map_renderCompleteExecuted() {
    this.isMapLoading$.next(false);
  }

  public loadGeomFromFile(file: File) {
    const kmlFormat = new KML();
    const reader = new FileReader();
    const fileName = file.name;

    reader.onload = (e) => {
      const fileContent = reader.result;
      if (fileContent) {
        const kmlFeatures = kmlFormat.readFeatures(fileContent, {
          dataProjection: 'EPSG:4326',
          featureProjection: this.configService.config?.epsg
        });
        this.addSingleFeatureToDrawingSource(kmlFeatures, fileName);
      }
    };
    reader.readAsText(file);
  }

  public setPageFormat(format: IPageFormat, scale: number, rotation: number) {

    this.eraseDrawing();
    this.transformInteraction.setActive(true);

    const center = this.map.getView().getCenter();

    const w = format.width * scale / 2000;
    const h = format.height * scale / 2000;
    let coordinates: Array<Array<Coordinate>>;
    if (center && center.length > 0) {
      coordinates = [[
        [center[0] - w, center[1] - h],
        [center[0] - w, center[1] + h],
        [center[0] + w, center[1] + h],
        [center[0] + w, center[1] - h],
        [center[0] - w, center[1] - h],
      ]];
      const poly = new Polygon(coordinates);
      poly.rotate(rotation * Math.PI / 180, center);

      const feature = new Feature();
      feature.setGeometry(poly);

      this.map.getView().fit(poly, { nearest: true });
      this.drawingSource.addFeature(feature);
      this.featureFromDrawing?.set('area', poly);
    }
  }

  public setBbox(xmin: number, ymin: number, xmax: number, ymax: number) {
    this.eraseDrawing();
    this.transformInteraction.setActive(true);
    const coordinates: Array<Array<Coordinate>> = [[
      [xmin, ymin],
      [xmin, ymax],
      [xmax, ymax],
      [xmax, ymin],
      [xmin, ymin],
    ]];
    const poly = new Polygon(coordinates);
    const feature = new Feature();
    feature.setGeometry(poly);
    this.map.getView().fit(poly, { nearest: true });
    this.drawingSource.addFeature(feature);
    this.featureFromDrawing?.set('area', poly);
  }

}
