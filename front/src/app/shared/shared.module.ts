import {NgModule} from '@angular/core';
import {IconTextComponent} from './icon-text/icon-text.component';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {ConfirmDialogComponent} from '../_components/confirm-dialog/confirm-dialog.component';
import {MatDialogModule} from '@angular/material/dialog';
import {OrderItemViewComponent} from '../_components/order-item-view/order-item-view.component';
import {MatTableModule} from '@angular/material/table';
import {WidgetHostDirective} from '../_directives/widget-host.directive';
import {SafeHtmlPipe} from '../_pipes/SafeHtmlPipe';

const MODULES = [
  CommonModule,
  MatIconModule,
  MatCardModule,
  MatButtonModule,
  MatDialogModule,
  MatTableModule
];

const COMPONENTS = [
  IconTextComponent,
  ConfirmDialogComponent,
  OrderItemViewComponent,
  WidgetHostDirective,
  SafeHtmlPipe
];

@NgModule({
  imports: MODULES,
  declarations: COMPONENTS,
  exports: COMPONENTS
})
export class SharedModule {
}
