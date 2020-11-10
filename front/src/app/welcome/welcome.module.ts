import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WelcomeRoutingModule} from './welcome-routing.module';
import {WelcomeComponent} from './welcome.component';
import {MapComponent} from './map/map.component';
import {CatalogComponent} from './catalog/catalog.component';
import {DialogMetadataComponent} from './catalog/dialog-metadata/dialog-metadata.component';
import {ReactiveFormsModule} from '@angular/forms';
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

const MODULES = [
  MatMenuModule,
  MatIconModule,
  MatTooltipModule,
  MatInputModule,
  MatCardModule,
  MatProgressSpinnerModule,
  AngularSplitModule,
  MatButtonModule,
  ScrollingModule,
  MatDialogModule,
  MatSnackBarModule,
  MatAutocompleteModule,
  MatExpansionModule
];

@NgModule({
  declarations: [WelcomeComponent, MapComponent, CatalogComponent, DialogMetadataComponent],
  imports: [
    CommonModule,
    WelcomeRoutingModule,
    ReactiveFormsModule,
    MODULES
  ],
  entryComponents: [
    DialogMetadataComponent
  ]
})
export class WelcomeModule {
}
