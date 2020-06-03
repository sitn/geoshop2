import {NgModule} from '@angular/core';
import {IconTextComponent} from './icon-text/icon-text.component';
import {MatIconModule} from '@angular/material/icon';
import {OrderViewComponent} from '../_components/order-view/order-view.component';
import {MatCardModule} from '@angular/material/card';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {ConfirmDialogComponent} from '../_components/confirm-dialog/confirm-dialog.component';
import {MatDialogModule} from '@angular/material/dialog';

const MODULES = [
  CommonModule,
  MatIconModule,
  MatCardModule,
  MatButtonModule,
  MatDialogModule
];

const COMPONENTS = [
  IconTextComponent,
  OrderViewComponent,
  ConfirmDialogComponent
];

@NgModule({
  imports: MODULES,
  declarations: COMPONENTS,
  exports: COMPONENTS
})
export class SharedModule {
}
