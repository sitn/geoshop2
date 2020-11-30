import {Injectable} from '@angular/core';
import {Observable, of, zip} from 'rxjs';
import {IOrder, IOrderItem, IOrderToPost, IOrderType, Order} from '../_models/IOrder';
import {HttpClient} from '@angular/common/http';
import {ConfigService} from './config.service';
import {IApiResponse, IApiResponseError} from '../_models/IApi';
import {catchError, flatMap, map, mergeMap} from 'rxjs/operators';
import {ApiService} from './api.service';
import {Product} from '../_models/IProduct';
import {Contact, IContact} from '../_models/IContact';
import {GeoshopUtils} from '../_helpers/GeoshopUtils';

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

  getFullOrder(order: IOrder): Observable<Order | null> {
    return zip(
      this.getContact(order.invoice_contact),
    ).pipe(
      map(data => {
        if (data[0].hasOwnProperty('error')) {
          throw data[0];
        }
        const newOrder = new Order(order);
        const contact = new Contact(data[0] as IContact);
        newOrder.deepInitialize(contact);
        return newOrder;
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

  updateOrPostOrder(order: Order, products: Product[], contact: Contact): Observable<IOrder | IApiResponseError> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/order/`);

    const currentOrderItems = order.items.map(oi => oi.product);
    const orderToPost: IOrderToPost = {
      title: order.title,
      description: order.description,
      geom: order.geometryAsGeoJson,
      order_type: order.order_type ? order.order_type : '',
      order_contact: order.order_contact,
      invoice_contact: -1,
      items: []
    };

    products.forEach(product => {
      if (currentOrderItems.indexOf(product.label) === -1) {
        const item: IOrderItem = {
          product: product.label,
        };
        orderToPost.items?.push(item);
      }
    });

    return this.createOrUpdateContact(contact).pipe(
      flatMap((iContact) => {
        if (iContact.hasOwnProperty('error')) {
          return of(iContact as IApiResponseError);
        } else {
          orderToPost.invoice_contact = GeoshopUtils.ExtractIdFromUrl((contact as IContact).url);
        }

        return order.HasId ?
          this.http.put<IOrder | IApiResponseError>(`${url.toString()}${order.Id}/`, orderToPost).pipe(
            catchError((error: IApiResponseError) => {
              console.error(error);
              return of(error);
            })
          ) :
          this.http.post<IOrder | IApiResponseError>(url.toString(), orderToPost).pipe(
            catchError((error: IApiResponseError) => {
              console.error(error);
              return of(error);
            })
          );
      })
    );
  }

  getContact(contactId: number) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/contact/${contactId}/`);

    return this.http.get<IContact | IApiResponseError>(url.toString());
  }

  createOrUpdateContact(contact: Contact) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = contact.HasId ?
      new URL(`${this.apiUrl}/contact/${contact.Id}/`) :
      new URL(`${this.apiUrl}/contact`);

    return contact.HasId ?
      this.http.put<IContact | IApiResponseError>(url.toString(), contact) :
      this.http.post<IContact | IApiResponseError>(url.toString(), contact);
  }

  updateOrderItemDataFormat(dataFormat: string, orderItemId: number): Observable<IOrderItem | IApiResponseError> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }
    const url = new URL(`${this.apiUrl}/orderitem/${orderItemId}/`);
    return this.http.patch<IOrderItem | IApiResponseError>(url.toString(), {data_format: dataFormat});
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
