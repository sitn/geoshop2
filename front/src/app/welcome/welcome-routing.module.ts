import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WelcomeComponent } from './welcome.component';
import { DownloadComponent } from './download/download.component';

const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'download/:uuid', component: DownloadComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WelcomeRoutingModule { }
