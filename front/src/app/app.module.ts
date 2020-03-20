import {BrowserModule} from '@angular/platform-browser';
import {NgModule, APP_INITIALIZER} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MaterialModule} from './material-module';
import {ConfigService} from './_services/config.service';
import {HttpClientModule} from '@angular/common/http';
import {AccountOverlayComponent} from './_components/account-overlay/account-overlay.component';
import {HelpOverlayComponent} from './_components/help-overlay/help-overlay.component';
import {MatRippleModule} from '@angular/material/core';
import {MatBadgeModule} from '@angular/material/badge';
import {CartOverlayComponent} from './_components/cart-overlay/cart-overlay.component';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {AuthEffects} from './_store/auth/auth.effects';
import {reducers, metaReducers} from './_store';

export function initializeApp(configService: ConfigService) {
  return () => configService.load();
}

@NgModule({
  declarations: [
    AppComponent,
    AccountOverlayComponent,
    HelpOverlayComponent,
    CartOverlayComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    MaterialModule,
    MatRippleModule,
    MatBadgeModule,
    StoreModule.forRoot(reducers, {metaReducers}),
    EffectsModule.forRoot([AuthEffects])
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
