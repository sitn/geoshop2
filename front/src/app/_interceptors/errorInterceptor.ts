import {HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse} from '@angular/common/http';
import {Observable, of, throwError} from 'rxjs';
import {Injectable} from '@angular/core';
import {AppState} from '../_store';
import {Store} from '@ngrx/store';
import * as fromAuth from '../_store/auth/auth.action';
import {catchError} from 'rxjs/operators';
import {Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(private store: Store<AppState>, private router: Router, private snackBar: MatSnackBar) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    return next.handle(req).pipe(
      catchError(response => {

        if (response instanceof HttpErrorResponse) {
          if (response.status === 401) {
            this.store.dispatch(fromAuth.logout());
            this.router.navigate(['/auth/login']);
          } else {
            const message = response.error.detail || response.message;
            this.snackBar.open(message, 'Ok', {panelClass: 'notification-error'});
          }
        }

        return throwError(response);
      })
    );
  }

}
