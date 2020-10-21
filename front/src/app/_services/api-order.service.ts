import {Injectable} from '@angular/core';
import {Observable, of, zip} from 'rxjs';
import {IOrder, IOrderItem, IOrderToPost, IOrderType, Order} from '../_models/IOrder';
import {HttpClient} from '@angular/common/http';
import {ConfigService} from './config.service';
import {IApiResponse, IApiResponseError} from '../_models/IApi';
import {catchError, map} from 'rxjs/operators';
import {ApiService} from './api.service';
import {Product} from '../_models/IProduct';

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

  getOrderType(url: string): Observable<IOrderType | undefined> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return !url ? of(undefined) : this.http.get<IOrderType>(url);
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

  getFullOrder(iOrder: IOrder): Observable<Order | null> {
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
      }),
      catchError(error => {
        console.error(error);
        return of(null);
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

  updateOrPostOrder(order: Order, products: Product[]): Observable<IOrder | IApiResponseError> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/order/`);

    const orderToPost: IOrderToPost = {
      title: order.title,
      description: order.description,
      geom: order.geometryAsGeoJson,
      order_type: order.orderType ? order.orderType.name : '',
      order_contact: order.order_contact,
      invoice_contact: order.invoice_contact,
      items: products.map(x => {
        const item: IOrderItem = {
          product: x.label,
        };

        return item;
      })
    };
    if (order.id) {
      return this.http.post<IOrder | IApiResponseError>(url.toString(), orderToPost).pipe(
        catchError(error => {
          console.error(error);
          return of(error);
        })
      );
    } else {
      orderToPost.id = order.id;
      return this.http.patch<IOrder | IApiResponseError>(url.toString(), orderToPost).pipe(
        catchError(error => {
          console.error(error);
          return of(error);
        })
      );
    }
  }

  deleteLastDraftOrder() {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/order/last_draft/`);

    return this.http.delete<number | IApiResponseError>(url.toString()).pipe(
      catchError(error => {
        console.error(error);
        return of(error);
      })
    );
  }
}
