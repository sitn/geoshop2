import {BrowserModule} from '@angular/platform-browser';
import {NgModule, APP_INITIALIZER} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ConfigService} from './_services/config.service';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {AccountOverlayComponent} from './_components/account-overlay/account-overlay.component';
import {HelpOverlayComponent} from './_components/help-overlay/help-overlay.component';
import {MatRippleModule} from '@angular/material/core';
import {MatBadgeModule} from '@angular/material/badge';
import {CartOverlayComponent} from './_components/cart-overlay/cart-overlay.component';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {AuthEffects} from './_store/auth/auth.effects';
import {reducers, metaReducers} from './_store';
import {TokenInterceptor} from './_interceptors/tokenInterceptor';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {MatDividerModule} from '@angular/material/divider';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {ErrorInterceptor} from './_interceptors/errorInterceptor';

export function initializeApp(configService: ConfigService) {
  return () => configService.load();
}

const MODULES = [
  MatRippleModule,
  MatBadgeModule,
  MatMenuModule,
  MatIconModule,
  MatDividerModule,
  MatToolbarModule,
  MatButtonModule,
  MatDialogModule,
  MatSnackBarModule
];

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
    MODULES,
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
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
