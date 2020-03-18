import { Component, OnInit } from '@angular/core';
import { MapService } from '../services/map/map.service';
import { IBasemap } from 'src/app/_models/IConfig';

@Component({
  selector: 'gs2-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  isDrawing = false;
  isTracking = false;
  basemaps: Array<IBasemap>;
  isMapLoading$ = this.mapService.isMapLoading$;
  
  constructor(private mapService: MapService) { }

  ngOnInit(): void {
    this.mapService.initialize();
    this.mapService.isTracking$.subscribe((isTracking) => {
      this.isTracking = isTracking;
    });
    this.basemaps = this.mapService.Basemaps;
  }

  toggleDrawing() {
    this.isDrawing = !this.isDrawing;
    this.mapService.toggleDrawing();
  }
  eraseDrawing() {
    this.mapService.eraseDrawing();
  }
  switchBasemap(gsId: number) {
    this.mapService.switchBasemap(gsId);
  }
  toggleGeolocation() {
    this.mapService.toggleTracking();
  }

}
