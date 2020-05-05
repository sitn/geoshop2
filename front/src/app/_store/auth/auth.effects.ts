import {Injectable} from '@angular/core';
import {Actions, ofType, createEffect} from '@ngrx/effects';
import * as LoginActions from './auth.action';
import {catchError, exhaustMap, map, tap} from 'rxjs/operators';
import {ApiService} from '../../_services/api.service';
import {of} from 'rxjs';
import {Router} from '@angular/router';
import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';

@Injectable()
export class AuthEffects {

  private snackBarRef: MatSnackBarRef<any>;

  constructor(
    private action$: Actions,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router) {
  }

  login$ = createEffect(() =>
    this.action$.pipe(
      ofType(LoginActions.login),
      exhaustMap(action =>
        this.apiService.login(action.credentials, action.callbackUrl).pipe(
          map(payload => LoginActions.loginSuccess(payload)),
          catchError(error => of(LoginActions.loginFailure(error)))
        ))
    ));

  loginSuccess$ = createEffect(() =>
      this.action$.pipe(
        ofType(LoginActions.loginSuccess),
        tap((payload) => {
          if (this.snackBarRef) {
            this.snackBarRef.dismiss();
          }
          this.router.navigate([payload.callbackUrl || '/']);
        })
      ), {
      dispatch: false
    }
  );

  loginFailure$ = createEffect(() =>
      this.action$.pipe(
        ofType(LoginActions.loginFailure),
        tap((response) => {
          this.snackBarRef = this.snackBar.open(response.error.detail, 'Ok', {
            panelClass: 'notification-error'
          });
        })
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
