import { Injectable } from '@angular/core';
import { ConfigService } from 'src/app/_services/config.service';

// Openlayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import BaseLayer from 'ol/layer/Base';
import XYZ from 'ol/source/XYZ';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import ScaleLine from 'ol/control/ScaleLine';
import OSM from 'ol/source/OSM';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private initialized = false;

  private view: View;
  private map: Map;

  constructor(private configService: ConfigService) { }

  public initialize() {
    if (this.initialized) {
      return;
    }

    this.initializeMap();
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

    this.initialized = true;
  }

  private initializeView() {
    this.view = new View({
      center: [771815.10, 5942074.07],
      zoom: 10,
    });
  }

  /* Base Map Managment */
  private generateBasemapLayersFromConfig(layers: Array<BaseLayer>) {

    let isVisible = true;  // -> display the first one
    const baseLayers: Array<TileLayer> = [];

    for (const basemap of this.configService.Basemaps) {
      if (basemap.url && basemap.gisServiceType === 'xyz') {

        const baseMapXYZ = { url: basemap.url };

        const xyzSource = new XYZ(baseMapXYZ);
        const tileLayer = {
          source: xyzSource,
          visible: isVisible,
          label: basemap.label,
          thumbnail: basemap.thumbUrl,
        };

        baseLayers.push(new TileLayer(tileLayer));
        isVisible = false;
      }
    }

    const layerGroup = new LayerGroup({
      layers: baseLayers,
    });

    layers.push(layerGroup);
  }
}
