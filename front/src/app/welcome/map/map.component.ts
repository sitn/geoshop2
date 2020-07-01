import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {MapService} from '../../_services/map.service';
import {IBasemap} from 'src/app/_models/IConfig';
import {FormControl, FormGroup} from '@angular/forms';
import {debounceTime, switchMap} from 'rxjs/operators';
import Geometry from 'ol/geom/Geometry';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import Feature from 'ol/Feature';

export const nameOfCategoryForGeocoder: { [prop: string]: string; } = {
  neophytes: 'Plantes invasives',
  search_satac: 'N° SATAC',
  search_entree_sortie: 'Entrée/sortie autoroute',
  rt16_giratoires: 'Giratoires',
  batiments_ofs: 'Bâtiments regBL et n° egid',
  axe_mistra: 'Routes et axes',
  search_arrets_tp: 'Arrêts transports publics',
  ImmeublesCantonHistorique: 'Biens-fonds historiques',
  point_interet: 'Points d\'intérêt',
  axe_rue: 'Axes et rues',
  nom_local_lieu_dit: 'Noms locaux et lieux-dits',
  search_cours_eau: 'Cours d\'eau',
  ImmeublesCanton: 'Biens-fonds',
  search_fo_administrations: 'Administrations forestières',
  search_uap_publique: 'Unité d\'aménagement publique',
  adresses_sitn: 'Adresses',
  localite: 'Localité',
  search_fo09: 'Secours en forêt',
  search_conc_hydr: 'Concessions hydrauliques',
};

@Component({
  selector: 'gs2-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  @Input() leftPositionForButtons: number;

  isDrawing = false;
  isTracking = false;
  isSearchLoading = false;
  shouldDisplayClearButton = false;
  basemaps: Array<IBasemap>;
  isMapLoading$ = this.mapService.isMapLoading$;

  // Geocoder
  formGeocoder = new FormGroup({
    search: new FormControl('')
  });
  geocoderGroupOptions: {
    id: string;
    label: string;
    items: { label: string; feature: Feature<Geometry>; }[]
  }[];

  public get searchCtrl() {
    return this.formGeocoder.get('search');
  }

  constructor(private mapService: MapService) {
  }

  ngOnInit(): void {
    this.mapService.initialize();
    this.mapService.isTracking$.subscribe((isTracking) => {
      this.isTracking = isTracking;
    });
    this.mapService.isDrawing$.subscribe((isDrawing) => this.isDrawing = isDrawing);
    this.basemaps = this.mapService.Basemaps;

    if (this.searchCtrl) {
      this.searchCtrl.valueChanges
        .pipe(
          debounceTime(500),
          switchMap(inputText => {
            this.isSearchLoading = true;
            if (inputText.length === 0) {
              this.shouldDisplayClearButton = false;
            }
            return this.mapService.geocoderSearch(inputText);
          })
        )
        .subscribe(features => {
          this.isSearchLoading = false;
          this.shouldDisplayClearButton = true;
          this.geocoderGroupOptions = [];

          for (const feature of features) {
            const categoryId = feature.get('layer_name');
            if (!categoryId) {
              continue;
            }

            let currentCategory = this.geocoderGroupOptions.find(x => x.id === categoryId);
            if (currentCategory) {
              currentCategory.items.push({
                label: feature.get('label'),
                feature
              });
            } else {
              currentCategory = {
                id: categoryId,
                label: nameOfCategoryForGeocoder[categoryId],
                items: [{
                  label: feature.get('label'),
                  feature
                }]
              };
              this.geocoderGroupOptions.push(currentCategory);
            }
          }
        });
    }
  }

  displayGeocoderResultWith(value: { label: string; geometry: Geometry }) {
    return value.label;
  }

  displayGeocoderResultOnTheMap(evt: MatAutocompleteSelectedEvent) {
    this.mapService.addFeatureFromGeocoderToDrawing(evt.option.value.feature);
    this.shouldDisplayClearButton = true;
  }

  toggleDrawing() {
    this.mapService.toggleDrawing();
  }

  eraseDrawing() {
    this.mapService.eraseDrawing();
  }

  switchBasemap(gsId: string) {
    this.mapService.switchBaseMap(gsId);
  }

  toggleGeolocation() {
    this.mapService.toggleTracking();
  }

}
