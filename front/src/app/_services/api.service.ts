import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IProduct} from '../_models/IProduct';
import {ConfigService} from './config.service';
import {Observable} from 'rxjs';
import {IApiResponse} from '../_models/IApi';
import {ICredentials, IIdentity} from '../_models/IIdentity';
import {IOrderType} from '../_models/IOrder';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
  }

  getProducts(offset?: number, limit?: number): Observable<IApiResponse<IProduct>> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/product`);
    if (limit) {
      url.searchParams.append('limit', limit.toString());
    }
    if (offset) {
      url.searchParams.append('offset', offset.toString());
    }

    return this.http.get<IApiResponse<IProduct>>(url.toString());
  }

  getOrderTypes() {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/ordertype`);

    return this.http.get<IApiResponse<IOrderType>>(url.toString())
      .pipe(
        map(x => x.results)
      );
  }

  getCustomers(userId: string = 'https://sitn.ne.ch/geoshop2_dev/identity/3') {
    return this.http.get<IIdentity[]>(userId).pipe(
      map(x => Array.isArray(x) ? x : [x])
    );
  }

  login(authenticate: ICredentials, callbackUrl: string): Observable<{ identity: Partial<IIdentity>; callbackUrl: string; }> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/token/`);

    return this.http.post<{ access: string; refresh: string; }>(url.toString(), authenticate)
      .pipe(
        map(x => {
          const identity: Partial<IIdentity> = {
            token: x.access,
            username: 'sub',
            first_name: 'Super',
            last_name: 'Bouchon',
          };

          return {
            identity,
            callbackUrl
          };
        })
      );
  }

  getProfile() {
    const user: IIdentity = {
      username: 'test',
      first_name: 'Marc',
      last_name: 'Milard',
      url: 'test'
    };

    return new Observable<{ identity: IIdentity }>(subscriber => {
      setTimeout(() => {
        subscriber.next({
          identity: user,
        });
        subscriber.complete();
      }, 2000);
    });
  }

  checkLoginNotTaken(login: string): Observable<{ result: boolean }> {
    return this.http.post<{ result: boolean }>(this.apiUrl + `/user/existsLogin`, {login});
  }

  forget(email: string) {
    return this.http.post<{ result: boolean }>(this.apiUrl + '/user/forget', {email});
  }

  resetPassword(passwordToken: string, password: string) {
    return this.http.post(this.apiUrl + '/user/reset', {password, passwordToken});
  }
}
