import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IProduct} from '../_models/IProduct';
import {ConfigService} from './config.service';
import {Observable, of, zip} from 'rxjs';
import {IApiResponse} from '../_models/IApi';
import {ICredentials, IIdentity} from '../_models/IIdentity';
import {map, switchMap} from 'rxjs/operators';
import {IMetadata} from '../_models/IMetadata';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
  }

  find<T>(inputText: string, endpoint: string): Observable<IApiResponse<T>> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/${endpoint}/`);
    url.searchParams.append('search', inputText);

    return this.http.get<IApiResponse<T>>(url.toString());
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
      return this.http.get<IMetadata>(url.toString()).pipe(
        map(result => {
          result.legend_link = result.legend_link ||
            'https://sitn.ne.ch/production/wsgi/mapserv_proxy?ogcserver=source+for+image%2Fpng&' +
            'cache_version=3969332d9fad4e0191777fe7da1f2e64&FORMAT=image%2Fpng&TRANSPARENT=true&' +
            'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=at100_affectations_primaires&SCALE=178571.07142857136';
          result.image_link = result.image_link ||
            'https://www.geocat.ch/geonetwork/srv/api/records/336/extents.png?mapsrs=EPSG:21781&width=500&background=settings';

          for (const person of result.contact_persons) {
            if (person && person.contact_person) {
              person.contact_person.phone = person.contact_person.phone.replace(/ /g, '');
            }
          }
          return result;
        })
      );
    } catch {
      return of(null);
    }
  }

  getCustomers(userId: string = 'https://sitn.ne.ch/geoshop2_dev/identity/3') {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return this.http.get<IIdentity[]>(userId).pipe(
      map(x => Array.isArray(x) ? x : [x])
    );
  }

  getIdentity(url: string | undefined): Observable<IIdentity | undefined> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return !url ? of(undefined) : this.http.get<IIdentity | undefined>(url);
  }

  login(authenticate: ICredentials, callbackUrl: string): Observable<{ identity: Partial<IIdentity>; callbackUrl: string; }> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/token/`);

    return this.http.post<{ access: string; refresh: string; }>(url.toString(), authenticate)
      .pipe(
        switchMap(x => {
          return this.getProfile(x.access).pipe(map(p => Object.assign({token: x.access, tokenRefresh: x.refresh}, p)));
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

  refreshToken(token: string): Observable<{ access: string; }> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return this.http.post<{ access: string; }>(this.apiUrl + `/token/refresh/`, {refresh: token});
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
