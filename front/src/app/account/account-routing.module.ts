import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';

import {AccountComponent} from './account.component';
import {NewOrderComponent} from './new-order/new-order.component';
import {OrdersComponent} from './orders/orders.component';
import {ProfileComponent} from './profile/profile.component';
import {LastDraftComponent} from './last-draft/last-draft.component';

const routes: Routes = [
  {path: '', component: AccountComponent},
  {path: 'new-order', component: NewOrderComponent},
  {path: 'orders', component: OrdersComponent},
  {path: 'profile', component: ProfileComponent},
  {path: 'lastDraft', component: LastDraftComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountRoutingModule {
}
