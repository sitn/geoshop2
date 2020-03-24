import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IProduct} from '../_models/IProduct';
import {ConfigService} from './config.service';
import {Observable} from 'rxjs';
import {IApiResponse} from '../_models/IApi';
import {ICredentials, IIdentity} from '../_models/IIdentity';

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

  login(authenticate: ICredentials, callbackUrl: string): Observable<{ identity: IIdentity, callbackUrl: string }> {
    const url = new URL(`${this.apiUrl}/login`);

    // return this.http.post<IIdentity>(url.toString(), authenticate);

    const user: IIdentity = {
      username: 'test',
      first_name: 'Marc',
      last_name: 'Milard',
      url: 'test'
    };

    const obs = new Observable<{ identity: IIdentity, callbackUrl: string }>(subscriber => {
      setTimeout(() => {
        subscriber.next({
          identity: user,
          callbackUrl
        });
        subscriber.complete();
      }, 2000);
    });

    return obs;
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
