import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WelcomeRoutingModule} from './welcome-routing.module';
import {WelcomeComponent} from './welcome.component';
import {MapComponent} from './map/map.component';
import {CatalogComponent} from './catalog/catalog.component';
import {DialogMetadataComponent} from './catalog/dialog-metadata/dialog-metadata.component';
import {ReactiveFormsModule, FormsModule} from '@angular/forms';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';
import {MatCardModule} from '@angular/material/card';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {AngularSplitModule} from 'angular-split';
import {MatButtonModule} from '@angular/material/button';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {MatDialogModule} from '@angular/material/dialog';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {PageformatComponent} from './map/pageformat/pageformat.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatSelectModule} from '@angular/material/select';
import {MatListModule} from '@angular/material/list';
import {SharedModule} from '../shared/shared.module';
import {DownloadComponent} from './download/download.component';
import {MatTabsModule} from '@angular/material/tabs';

const MODULES = [
  MatMenuModule,
  MatTabsModule,
  MatIconModule,
  MatTooltipModule,
  MatInputModule,
  MatCardModule,
  MatListModule,
  MatProgressSpinnerModule,
  AngularSplitModule,
  MatButtonModule,
  ScrollingModule,
  MatDialogModule,
  MatSnackBarModule,
  MatAutocompleteModule,
  MatExpansionModule,
  MatButtonToggleModule,
  FormsModule,
  DragDropModule,
  MatSelectModule
];

@NgModule({
  declarations: [
    WelcomeComponent,
    MapComponent,
    CatalogComponent,
    DownloadComponent,
    DialogMetadataComponent,
    PageformatComponent
  ],
  imports: [
    CommonModule,
    WelcomeRoutingModule,
    ReactiveFormsModule,
    MODULES,
    SharedModule
  ],
  entryComponents: [
    DialogMetadataComponent
  ]
})
export class WelcomeModule {
}
