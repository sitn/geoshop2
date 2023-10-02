import {BrowserModule} from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER, LOCALE_ID, DEFAULT_CURRENCY_CODE, Inject } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeCH from '@angular/common/locales/fr-CH';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ConfigService} from './_services/config.service';
import {CustomIconService} from './_services/custom-icon.service';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {AccountOverlayComponent} from './_components/account-overlay/account-overlay.component';
import {HelpOverlayComponent} from './_components/help-overlay/help-overlay.component';
import {MatRippleModule} from '@angular/material/core';
import {MatBadgeModule} from '@angular/material/badge';
import {CartOverlayComponent} from './_components/cart-overlay/cart-overlay.component';
import {StoreModule, Store} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {AuthEffects} from './_store/auth/auth.effects';
import {reducers, metaReducers, AppState, getUser} from './_store';
import {TokenInterceptor} from './_interceptors/tokenInterceptor';
import {MatLegacyMenuModule as MatMenuModule} from '@angular/material/legacy-menu';
import {MatIconModule} from '@angular/material/icon';
import {MatDividerModule} from '@angular/material/divider';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {ErrorInterceptor} from './_interceptors/errorInterceptor';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {OverlayContainer} from '@angular/cdk/overlay';
import {ActivatedRoute} from '@angular/router';
import {CartEffects} from './_store/cart/cart.effects';
import * as fromAuth from './_store/auth/auth.action';
import {CommonModule} from '@angular/common';

registerLocaleData(localeCH);

export function initializeApp(configService: ConfigService, store: Store<AppState>) {
  return () => configService.load().then(() => {
      store.select(getUser).subscribe(user => {
        if (user && user.tokenRefresh) {
          store.dispatch(fromAuth.refreshToken({token: user.tokenRefresh}));
        }
      });
    })
}

const MODULES = [
  CommonModule,
  MatRippleModule,
  MatBadgeModule,
  MatMenuModule,
  MatIconModule,
  MatDividerModule,
  MatToolbarModule,
  MatButtonModule,
  MatDialogModule,
  MatSnackBarModule,
  MatTooltipModule
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
    EffectsModule.forRoot([AuthEffects, CartEffects])
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService, [new Inject(Store)]],
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
    },
    {
      provide: LOCALE_ID,
      useValue: 'fr-CH'
    },
    {
      provide: DEFAULT_CURRENCY_CODE,
      useValue: 'CHF'
    },
    CustomIconService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(overlayContainer: OverlayContainer, route: ActivatedRoute) {
    route.queryParams.subscribe(res => {
      if (res.theme && res.theme === 'dark') {
        overlayContainer.getContainerElement().classList.add('theme-alternate');
        document.body.classList.add('theme-alternate');
      }
      if (res.theme && res.theme === 'light') {
        overlayContainer.getContainerElement().classList.remove('theme-alternate');
        document.body.classList.remove('theme-alternate');
      }
    });
  }
}
