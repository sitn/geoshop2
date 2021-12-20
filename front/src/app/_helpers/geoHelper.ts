import Polygon from 'ol/geom/Polygon';
import {getArea} from 'ol/sphere';
import {ConfigService} from '../_services/config.service';
import proj4 from 'proj4';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Projection from 'ol/proj/Projection';
import View from 'ol/View';
import {fromLonLat} from 'ol/proj';
import {MapService} from '../_services/map.service';
import Map from 'ol/Map';
import LayerGroup from 'ol/layer/Group';
import {defaults} from 'ol/interaction';
import {register} from 'ol/proj/proj4';
import {Order} from '../_models/IOrder';
import Feature from 'ol/Feature';

export class GeoHelper {
  /**
   * Format area output.
   */
  public static formatArea(polygon: Polygon): string {
    const area = getArea(polygon);
    let output;
    if (area > 10000) {
      output = (Math.round(area / 1000000 * 100) / 100) +
        ' ' + 'km2';
    } else {
      output = (Math.round(area * 100) / 100) +
        ' ' + 'm2';
    }
    return output;
  }

  public static async generateMiniMap(configService: ConfigService, mapService: MapService) {
    const EPSG = configService.config?.epsg || 'EPSG:2056';
    if (!mapService.FirstBaseMapLayer) {
      proj4.defs(EPSG,
        '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333'
        + ' +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel '
        + '+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs');
      register(proj4);
    }

    const vectorSource = new VectorSource();
    vectorSource.on('addfeature', () => {

    });
    const layer = new VectorLayer({
      source: vectorSource,
      style: mapService.drawingStyle
    });

    const projection = new Projection({
      code: EPSG,
      // @ts-ignore
      extent: configService.config.initialExtent,
    });
    const view = new View({
      projection,
      center: fromLonLat([6.80, 47.05], projection),
      zoom: 4,
    });

    const baseMapConfig = configService.config?.basemaps[0];
    
    let layers;
    if (baseMapConfig) {
      const tileLayer = await mapService.createTileLayer(baseMapConfig, true);
      const groupLayers = tileLayer ? [tileLayer] : []
      layers = new LayerGroup( {layers: groupLayers })
    }
    const minimap = new Map({
      layers,
      view,
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

  public static displayMiniMap(order: Order, miniMaps: any[], vectorSources: any[], index: number) {
    if (!order || !order.geom) {
      return;
    }
    const target = `mini-map-${order.id}`;
    miniMaps[index].setTarget(target);

    const feature = new Feature();
    feature.setGeometry(order.geom);
    vectorSources[index].clear();
    vectorSources[index].addFeature(feature);

    miniMaps[index].getView().fit(order.geom, {
      padding: [50, 50, 50, 50]
    });
  }
}
