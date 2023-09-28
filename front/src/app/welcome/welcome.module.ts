import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WelcomeRoutingModule} from './welcome-routing.module';
import {WelcomeComponent} from './welcome.component';
import {MapComponent} from './map/map.component';
import {CatalogComponent} from './catalog/catalog.component';
import {DialogMetadataComponent} from './catalog/dialog-metadata/dialog-metadata.component';
import {ReactiveFormsModule, FormsModule} from '@angular/forms';
import {MatLegacyMenuModule as MatMenuModule} from '@angular/material/legacy-menu';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatLegacyProgressSpinnerModule as MatProgressSpinnerModule} from '@angular/material/legacy-progress-spinner';
import {AngularSplitModule} from 'angular-split';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {MatLegacyAutocompleteModule as MatAutocompleteModule} from '@angular/material/legacy-autocomplete';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {ManualentryComponent} from './map/manualentry/manualentry.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatLegacyListModule as MatListModule} from '@angular/material/legacy-list';
import {SharedModule} from '../shared/shared.module';
import {DownloadComponent} from './download/download.component';
import {MatLegacyTabsModule as MatTabsModule} from '@angular/material/legacy-tabs';
import { ValidateComponent } from './validate/validate.component';

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
        ValidateComponent,
        DialogMetadataComponent,
        ManualentryComponent
    ],
    imports: [
        CommonModule,
        WelcomeRoutingModule,
        ReactiveFormsModule,
        MODULES,
        SharedModule
    ]
})
export class WelcomeModule {
}
