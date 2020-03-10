import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WelcomeRoutingModule } from './welcome-routing.module';
import { WelcomeComponent } from './welcome.component';
import { MaterialModule } from '../material-module';
import { MapComponent } from './map/map.component';


@NgModule({
  declarations: [WelcomeComponent, MapComponent],
  imports: [
    CommonModule,
    MaterialModule,
    WelcomeRoutingModule,
  ]
})
export class WelcomeModule { }
