import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IProduct} from '../_models/IProduct';
import {ConfigService} from './config.service';
import {Observable, of, zip} from 'rxjs';
import {IApiResponse, IApiResponseError} from '../_models/IApi';
import {ICredentials, IIdentity} from '../_models/IIdentity';
import {catchError, map, switchMap} from 'rxjs/operators';
import {IMetadata} from '../_models/IMetadata';
import {IUser, IUserChangeResponse, IUserToPost} from '../_models/IUser';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
  }

  find<T>(inputText: string, endpoint: string): Observable<IApiResponse<T> | null> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = `${this.apiUrl}/${endpoint}/`;

    return this.http.get<IApiResponse<T> | null>(url, {
      params: {search: inputText}
    }).pipe(
      catchError(() => {
        return of(null);
      })
    );
  }

  getProducts(offset?: number, limit?: number) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/product/`);
    if (limit) {
      url.searchParams.append('limit', limit.toString());
    }
    if (offset) {
      url.searchParams.append('offset', offset.toString());
    }

    return this.http.get<IApiResponse<IProduct>>(url.toString())
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  getProduct(productid: number) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/product/${productid}/`);

    return this.http.get<IProduct>(url.toString())
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  loadMetadata(urlAsString?: string): Observable<IMetadata | null> {
    if (!urlAsString) {
      return of(null);
    }
    try {
      const url = new URL(urlAsString);
      return this.http.get<IMetadata>(url.toString())
        .pipe(
          catchError(() => {
            return of(null);
          })
        );
    } catch {
      return of(null);
    }
  }

  login(authenticate: ICredentials, callbackUrl: string): Observable<{ identity: Partial<IIdentity>; callbackUrl: string; }> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/token/`);

    return this.http.post<{ access: string; refresh: string; }>(url.toString(), authenticate)
      .pipe(
        switchMap(x => {
          return this.getProfile(x.access)
            .pipe(map(p => Object.assign({token: x.access, tokenRefresh: x.refresh}, p)));
        }),
        map(x => {
          return {
            identity: x,
            callbackUrl
          };
        })
      );
  }

  getProfile(token?: string) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const headers = {
      Authorization: `Bearer ${token}`
    };

    return token ?
      this.http.get<IUser>(this.apiUrl + '/auth/current/', {headers}) :
      this.http.get<IUser>(this.apiUrl + '/auth/current/');
  }

  change(user: IUserToPost) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return this.http.post<IUserChangeResponse | null>(this.apiUrl + '/auth/change/', user)
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  register(user: IIdentity) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return this.http.post(this.apiUrl + '/auth/register/', user)
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  refreshToken(token: string): Observable<{ access: string; }> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return this.http.post<{ access: string; }>(this.apiUrl + `/token/refresh/`, {refresh: token});
  }

  checkLoginNotTaken(login: string): Observable<{ result: boolean } | null> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }
    return this.http.post<{ result: boolean }>(this.apiUrl + `/user/existsLogin/`, {login})
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  forget(email: string) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }
    return this.http.post<{ result: boolean }>(this.apiUrl + '/auth/password/', {email})
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  resetPassword(password1: string, password2: string, uid: string, token: string) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }
    return this.http.post(this.apiUrl + '/auth/password/confirm', {
      new_password1: password1,
      new_password2: password2,
      uid,
      token
    }).pipe(
      catchError(() => {
        return of(null);
      })
    );
  }
}
