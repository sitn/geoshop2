import {NgModule} from '@angular/core';
import {IconTextComponent} from './icon-text/icon-text.component';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {CommonModule} from '@angular/common';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {ConfirmDialogComponent} from '../_components/confirm-dialog/confirm-dialog.component';
import {MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {OrderItemViewComponent} from '../_components/order-item-view/order-item-view.component';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
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
