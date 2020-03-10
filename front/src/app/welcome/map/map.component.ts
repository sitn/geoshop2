import { Component, OnInit } from '@angular/core';
import { MapService } from '../services/map/map.service';

@Component({
  selector: 'gs2-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  constructor(private mapService: MapService) { }

  ngOnInit(): void {
    this.mapService.initialize();
  }

}
