import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WelcomeRoutingModule } from './welcome-routing.module';
import { WelcomeComponent } from './welcome.component';
import { MaterialModule } from '../material-module';
import { MapComponent } from './map/map.component';
import { CatalogComponent } from './catalog/catalog.component';
import { DialogMetadataComponent } from './catalog/dialog-metadata/dialog-metadata.component';


@NgModule({
  declarations: [WelcomeComponent, MapComponent, CatalogComponent, DialogMetadataComponent],
  imports: [
    CommonModule,
    MaterialModule,
    WelcomeRoutingModule,
  ]
})
export class WelcomeModule { }
