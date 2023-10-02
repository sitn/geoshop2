import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {AccountRoutingModule} from './account-routing.module';
import {AccountComponent} from './account.component';
import {NewOrderComponent} from './new-order/new-order.component';
import {MatStepperModule} from '@angular/material/stepper';
import {ReactiveFormsModule} from '@angular/forms';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatLegacyFormFieldModule as MatFormFieldModule} from '@angular/material/legacy-form-field';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyAutocompleteModule as MatAutocompleteModule} from '@angular/material/legacy-autocomplete';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import {MatLegacyPaginatorModule as MatPaginatorModule} from '@angular/material/legacy-paginator';
import {MatSortModule} from '@angular/material/sort';
import {OrdersComponent} from './orders/orders.component';
import {MatDividerModule} from '@angular/material/divider';
import {SharedModule} from '../shared/shared.module';
import {ProfileComponent} from './profile/profile.component';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {MatLegacyProgressSpinnerModule as MatProgressSpinnerModule} from '@angular/material/legacy-progress-spinner';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyRadioModule as MatRadioModule} from '@angular/material/legacy-radio';
import {MatExpansionModule} from '@angular/material/expansion';
import {ModifyProfileComponent} from './profile/modify-profile.component';
import { OrderComponent } from './orders/order/order.component';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';

const MODULES = [
  ReactiveFormsModule,
  MatStepperModule,
  MatButtonModule,
  MatFormFieldModule,
  MatSelectModule,
  MatInputModule,
  MatAutocompleteModule,
  MatIconModule,
  MatCardModule,
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatDividerModule,
  MatAutocompleteModule,
  ScrollingModule,
  MatStepperModule,
  MatProgressSpinnerModule,
  MatCheckboxModule,
  MatRadioModule,
  MatExpansionModule,
  MatTooltipModule
];

@NgModule({
  declarations: [AccountComponent, NewOrderComponent, OrdersComponent, ProfileComponent, ModifyProfileComponent, OrderComponent],
  imports: [
    CommonModule,
    AccountRoutingModule,
    MODULES,
    SharedModule
  ]
})
export class AccountModule {
}
