import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IProduct} from '../_models/IProduct';
import {ConfigService} from './config.service';
import {Observable, of} from 'rxjs';
import {IApiResponse} from '../_models/IApi';
import {ICredentials, IIdentity} from '../_models/IIdentity';
import {IOrder, IOrderType} from '../_models/IOrder';
import {catchError, map, switchMap} from 'rxjs/operators';
import {IMetadata} from '../_models/IMetadata';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
  }

  findProducts(textInput: string) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/product/`);
    url.searchParams.append('search', textInput);

    return this.http.get<IApiResponse<IProduct>>(url.toString());
  }

  getProducts(offset?: number, limit?: number): Observable<IApiResponse<IProduct>> {
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

    return this.http.get<IApiResponse<IProduct>>(url.toString());
  }

  loadMetadata(urlAsString: string): Observable<IMetadata | null> {
    try {
      const url = new URL(urlAsString);
      return this.http.get<IMetadata>(url.toString());
    } catch {
      return of(null);
    }
  }

  getOrderTypes() {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/ordertype/`);

    return this.http.get<IApiResponse<IOrderType>>(url.toString())
      .pipe(
        map(x => x.results)
      );
  }

  getCustomers(userId: string = 'https://sitn.ne.ch/geoshop2_dev/identity/3') {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return this.http.get<IIdentity[]>(userId).pipe(
      map(x => Array.isArray(x) ? x : [x])
    );
  }

  getOrders(offset?: number, limit?: number): Observable<IApiResponse<IOrder>> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/order/`);
    if (limit) {
      url.searchParams.append('limit', limit.toString());
    }
    if (offset) {
      url.searchParams.append('offset', offset.toString());
    }

    return this.http.get<IApiResponse<IOrder>>(url.toString());
  }

  getOrder(url: string): Observable<IOrder> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return this.http.get<IOrder>(url);
  }

  getOrderType(url: string): Observable<IOrderType> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return this.http.get<IOrderType>(url);
  }

  login(authenticate: ICredentials, callbackUrl: string): Observable<{ identity: Partial<IIdentity>; callbackUrl: string; }> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/token/`);

    return this.http.post<{ access: string; refresh: string; }>(url.toString(), authenticate)
      .pipe(
        switchMap(x => {
          return this.getProfile(x.access).pipe(map(p => Object.assign({token: x.access}, p)));
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
      this.http.get<IIdentity>(this.apiUrl + '/auth/current/', {headers}) :
      this.http.get<IIdentity>(this.apiUrl + '/auth/current/');
  }

  register(user: IIdentity) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return this.http.post(this.apiUrl + '/auth/register/', user);
  }

  verifyToken(token: string): Observable<boolean> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return this.http.post<{ detail: string; code: string; }>(this.apiUrl + `/token/verify/`, {token})
      .pipe(
        map(x => x && x.code == null),
        catchError(() => of(false))
      );
  }

  checkLoginNotTaken(login: string): Observable<{ result: boolean }> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }
    return this.http.post<{ result: boolean }>(this.apiUrl + `/user/existsLogin/`, {login});
  }

  forget(email: string) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }
    return this.http.post<{ result: boolean }>(this.apiUrl + '/auth/password/', {email});
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
    });
  }
}
