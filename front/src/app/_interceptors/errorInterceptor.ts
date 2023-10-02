import {HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {Injectable} from '@angular/core';
import {AppState} from '../_store';
import {Store} from '@ngrx/store';
import * as fromAuth from '../_store/auth/auth.action';
import {catchError} from 'rxjs/operators';
import {Router} from '@angular/router';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';

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
            const messages = [];
            for (const attr in response.error) {
              if (response.error[attr]) {
                if (Array.isArray(response.error[attr])) {
                  messages.push(...response.error[attr]);
                } else if (response.error[attr] === 'string') {
                  messages.push(response.error[attr]);
                }
              }
            }
            if (messages.length === 0) {
              messages.push(response.message);
            }
            this.snackBar.open(messages.join('\r\n'), 'Ok', {panelClass: 'notification-error'});
          }
        }

        return throwError(response);
      })
    );
  }

}
