import {Component, Input, OnInit, ViewChild, ElementRef} from '@angular/core';
import {ConfigService} from 'src/app/_services/config.service';
import {MapService} from '../../_services/map.service';
import { CustomIconService } from '../../_services/custom-icon.service';
import {IBasemap, IPageFormat} from 'src/app/_models/IConfig';
import {FormControl, FormGroup} from '@angular/forms';
import {debounceTime, switchMap} from 'rxjs/operators';
import Geometry from 'ol/geom/Geometry';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import Feature from 'ol/Feature';
import {MatDialog} from '@angular/material/dialog';
import {PageformatComponent} from './pageformat/pageformat.component';

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
  recenter_to: 'Recentrer sur',
  localite: 'Localité',
  search_fo09: 'Secours en forêt',
  search_conc_hydr: 'Concessions hydrauliques',
  communes: 'Communes',
  cadastres: 'Cadastres',
};

@Component({
  selector: 'gs2-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  @Input() leftPositionForButtons: number;
  @ViewChild('fileUpload', {static: false}) fileUpload: ElementRef;

  isDrawing = false;
  isTracking = false;
  isSearchLoading = false;
  shouldDisplayClearButton = false;
  basemaps: Array<IBasemap>;
  pageformats: Array<IPageFormat>;
  isMapLoading$ = this.mapService.isMapLoading$;
  selectedPageFormat: IPageFormat;
  selectedPageFormatScale = 500;
  rotationPageFormat = 0;
  pageFormatScales: Array<number> = [500, 1000, 2000, 5000];
  xMin = null;
  yMin = null;
  xMax = null;
  yMax = null;
  activeTab = 0;

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

  constructor(private mapService: MapService,
              private configService: ConfigService,
              private customIconService: CustomIconService,
              public dialog: MatDialog) {
    // Initialize custom icons
    this.customIconService.init();
  }

  ngOnInit(): void {
    this.mapService.initialize();
    this.mapService.isDrawing$.subscribe((isDrawing) => this.isDrawing = isDrawing);
    this.basemaps = this.mapService.Basemaps;
    this.pageformats = this.mapService.PageFormats;
    this.selectedPageFormat = this.configService.config.pageformats[0];

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
            if (this.configService.config.geocoderLayers.indexOf(categoryId) < 0) {
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

  toggleDrawing(drawingMode?: string) {
    this.mapService.toggleDrawing(drawingMode);
  }

  eraseDrawing() {
    this.mapService.eraseDrawing();
  }

  switchBasemap(gsId: string) {
    this.mapService.switchBaseMap(gsId);
  }

  openFileImport() {
    const fileUpload = this.fileUpload.nativeElement;
    fileUpload.onchange = () => {
      this.mapService.loadGeomFromFile(fileUpload.files[0]);
    };
    fileUpload.click();
  }

  togglePageformat(): void {
    const dialogRef = this.dialog.open(PageformatComponent, {
      minWidth: 250,
      autoFocus: true,
      data: {
        pageFormatScales: this.pageFormatScales,
        pageFormats: this.pageformats,
        selectedPageFormat: this.selectedPageFormat,
        selectedPageFormatScale: this.selectedPageFormatScale,
        rotationPageFormat: this.rotationPageFormat,
        activeTab: this.activeTab
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.activeTab === 0) {
          this.selectedPageFormat = result.selectedPageFormat;
          this.selectedPageFormatScale = result.selectedPageFormatScale;
          this.rotationPageFormat = result.rotationPageFormat;
          this.mapService.setPageFormat(this.selectedPageFormat, this.selectedPageFormatScale, this.rotationPageFormat);
        } else {
          this.activeTab = 0
          this.mapService.setBbox(
            result.xMin,
            result.yMin,
            result.xMax,
            result.yMax,
          );
        }
      }
    });
  }

}
