import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AccountComponent } from './account.component';
import {NewOrderComponent} from './new-order/new-order.component';

const routes: Routes = [
  { path: '', component: AccountComponent },
  { path: 'new-order', component: NewOrderComponent },
  ];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountRoutingModule { }
