import {Injectable} from '@angular/core';
import {Observable, zip} from 'rxjs';
import {IOrder, IOrderType, Order} from '../_models/IOrder';
import {HttpClient} from '@angular/common/http';
import {ConfigService} from './config.service';
import {IApiResponse} from '../_models/IApi';
import {map} from 'rxjs/operators';
import {ApiService} from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ApiOrderService {

  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private apiService: ApiService,
  ) {
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

  getOrders(offset?: number, limit?: number): Observable<IApiResponse<Order>> {
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

    return this.http.get<IApiResponse<Order>>(url.toString());
  }

  getFullOrder(iOrder: IOrder): Observable<Order> {
    return zip(
      this.getOrderType(iOrder.order_type),
      this.apiService.getIdentity(iOrder.invoice_contact),
      this.apiService.getIdentity(iOrder.order_contact),
      this.apiService.getIdentity(iOrder.client),
    ).pipe(
      map(data => {
        console.log(data);

        const order = new Order(iOrder);
        order.deepInitialize(data[0], data[1], data[2], data[3]);
        return order;
      })
    );
  }

  getLastDraft(): Observable<Order | null> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/order/last_draft/`);

    return this.http.get<IOrder>(url.toString()).pipe(map(iOrder => iOrder ? new Order(iOrder) : null));
  }
}
