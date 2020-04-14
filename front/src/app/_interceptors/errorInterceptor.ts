import {HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {Injectable} from '@angular/core';
import {AppState} from '../_store';
import {Store} from '@ngrx/store';
import * as fromAuth from '../_store/auth/auth.action';
import {catchError} from 'rxjs/operators';
import {Router} from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(private store: Store<AppState>, private router: Router) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    return next.handle(req).pipe(
      catchError(response => {
        if (response instanceof HttpErrorResponse && response.status === 403) {
          this.store.dispatch(fromAuth.logout());
          this.router.navigate(['/auth/login']);
        }
        return throwError(response);
      })
    );
  }

}
