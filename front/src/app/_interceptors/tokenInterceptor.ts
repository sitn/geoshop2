import {HttpInterceptor, HttpRequest, HttpHandler, HttpEvent} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Injectable} from '@angular/core';
import {AppState} from '../_store';
import {Store} from '@ngrx/store';
import * as fromRoot from '../_store/index';
import {first, flatMap} from 'rxjs/operators';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(private store: Store<AppState>) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    return this.store.select(fromRoot.getToken).pipe(
      first(),
      flatMap(token => {
        const authReq = !!token ? req.clone({
          setHeaders: {Authorization: `Bearer ${token}`}
        }) : req;

        return next.handle(authReq);
      })
    );
  }

}
