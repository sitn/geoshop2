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
import Geocoder from 'ol-geocoder/dist/ol-geocoder.js';

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

    this.initializeGeocoder();

    this.initialized = true;
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
