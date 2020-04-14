import {NgModule} from '@angular/core';
import {IconTextComponent} from './icon-text/icon-text.component';
import {MatIconModule} from '@angular/material/icon';

const MODULES = [
  MatIconModule,
];

const COMPONENTS = [
  IconTextComponent
];

@NgModule({
  imports: MODULES,
  declarations: COMPONENTS,
  exports: COMPONENTS
})
export class SharedModule {
}
