import {Injectable} from '@angular/core';
import {Actions, ofType, createEffect} from '@ngrx/effects';
import * as LoginActions from './auth.action';
import {catchError, exhaustMap, map, tap} from 'rxjs/operators';
import {ApiService} from '../../_services/api.service';
import {of} from 'rxjs';
import {Router} from '@angular/router';

@Injectable()
export class AuthEffects {

  constructor(
    private action$: Actions,
    private apiService: ApiService,
    private router: Router) {
  }

  login$ = createEffect(() =>
    this.action$.pipe(
      ofType(LoginActions.login),
      exhaustMap(action =>
        this.apiService.login(action.credentials, action.callbackUrl).pipe(
          map(payload => LoginActions.loginSuccess(payload)),
          catchError(error => of(LoginActions.loginFailure({error})))
        ))
    ));

  loginSuccess$ = createEffect(() =>
      this.action$.pipe(
        ofType(LoginActions.loginSuccess),
        tap((payload) => this.router.navigate([payload.callbackUrl || '/']))
      ), {
      dispatch: false
    }
  );

  logout$ = createEffect(() =>
      this.action$.pipe(
        ofType(LoginActions.logout),
        tap(() => this.router.navigate(['']))
      ), {
      dispatch: false
    }
  );
}
