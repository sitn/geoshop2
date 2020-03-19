import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IProduct} from '../_models/IProduct';
import {ConfigService} from './config.service';
import {Observable} from 'rxjs';
import {IApiResponse} from '../_models/IApi';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly apiUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.apiUrl = configService.ApiUrl;
  }

  getProducts(offset?: number, limit?: number): Observable<IApiResponse<IProduct>> {
    const url = new URL(`${this.apiUrl}/product`);
    if (limit) {
      url.searchParams.append('limit', limit.toString());
    }
    if (offset) {
      url.searchParams.append('offset', offset.toString());
    }

    return this.http.get<IApiResponse<IProduct>>(url.toString());
  }
}
