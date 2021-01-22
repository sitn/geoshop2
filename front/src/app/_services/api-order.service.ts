import {Injectable} from '@angular/core';
import {Observable, of, zip} from 'rxjs';
import {IOrder, IOrderDowloadLink, IOrderItem, IOrderSummary, IOrderToPost, IOrderType, Order} from '../_models/IOrder';
import {HttpClient} from '@angular/common/http';
import {ConfigService} from './config.service';
import {IApiResponse, IApiResponseError} from '../_models/IApi';
import {catchError, flatMap, map} from 'rxjs/operators';
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
  ) {
  }

  getOrder(url: string): Observable<IOrder | undefined> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return !url ? of(undefined) : this.http.get<IOrder>(url);
  }

  getOrderType(url: string): Observable<IOrderType | undefined> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    return !url ? of(undefined) : this.http.get<IOrderType>(url);
  }

  getOrderTypes(): Observable<Array<IOrderType>> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/ordertype/`);

    return this.http.get<IApiResponse<IOrderType>>(url.toString())
      .pipe(
        map(x => x.results)
      );
  }

  getOrders(offset?: number, limit?: number): Observable<IApiResponse<IOrderSummary>> {
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

    return this.http.get<IApiResponse<IOrderSummary>>(url.toString());
  }

  getFullOrder(orderJson: IOrder): Observable<Order | undefined> {
    return zip(
      this.getContact(orderJson.invoice_contact),
    ).pipe(
      map(data => {
        if (data[0] && data[0].hasOwnProperty('error')) {
          throw data[0];
        }

        const order = GeoshopUtils.deepCopyOrder(orderJson);

        const newOrder = new Order(order);

        if (data[0]) {
          const contact = new Contact(data[0] as IContact);
          newOrder.invoiceContact = contact;
        }

        return newOrder;
      }),
      catchError(error => {
        console.error(error);
        return of(undefined);
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

  createOrder(jsonOrder: IOrderToPost): Observable<IOrder | IApiResponseError> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/order/`);

    return this.http.post<IOrder | IApiResponseError>(url.toString(), jsonOrder)
      .pipe(
        catchError((error: IApiResponseError) => {
          console.error(error);
          return of(error);
        })
      );
  }

  updateOrder(order: Order, contact: Contact | undefined): Observable<IOrder | undefined | IApiResponseError> {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/order/`);

    return this.createOrUpdateContact(contact)
      .pipe(
        flatMap((newJsonContact) => {

            if (newJsonContact?.hasOwnProperty('error')) {
              return of(newJsonContact as IApiResponseError);
            }

            const orderToPost = order.toPostAsJson;
            orderToPost.invoice_contact = newJsonContact ?
              GeoshopUtils.ExtractIdFromUrl((newJsonContact as IContact).url) :
              null;

            return this.http.put<IOrder | IApiResponseError>(`${url.toString()}${order.id}/`, orderToPost)
              .pipe(
                catchError((error: IApiResponseError) => {
                  console.error(error);
                  return of(error);
                })
              );
          }
        ));
  }

  confirmOrder(orderId: number) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/order/${orderId}/confirm/`);

    return this.http.get<IOrder | null>(url.toString())
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  public downloadOrder(orderId: number, isOrderItem = false) {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const orderText = isOrderItem ? 'orderitem' : 'order';
    const url = new URL(`${this.apiUrl}/${orderText}/${orderId}/download_link/`);

    return this.http.get<IOrderDowloadLink | IApiResponseError>(url.toString())
      .pipe(
        catchError((error: IApiResponseError) => {
          console.error(error);
          return of(error);
        })
      );
  }

  getContact(contactId: number | string) {
    if (contactId < 0 || typeof contactId !== 'number') {
      return of(undefined);
    }

    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/contact/${contactId}/`);

    return this.http.get<IContact | IApiResponseError>(url.toString());
  }

  createOrUpdateContact(contact: Contact | undefined): Observable<IContact | undefined | IApiResponseError> {
    if (!contact || contact.HasId) {
      return of(contact);
    }

    if (!this.apiUrl) {
      this.apiUrl = this.configService.config.apiUrl;
    }

    const url = new URL(`${this.apiUrl}/contact/`);

    return this.http.post<IContact | IApiResponseError>(url.toString(), contact);
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
