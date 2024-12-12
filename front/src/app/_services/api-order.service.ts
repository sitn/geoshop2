import { Injectable } from '@angular/core';
import { Observable, of, zip } from 'rxjs';
import { IOrder, IOrderDowloadLink, IOrderItem, IOrderSummary, IOrderToPost, IOrderType, Order } from '../_models/IOrder';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';
import { IApiResponse } from '../_models/IApi';
import { catchError, flatMap, map } from 'rxjs/operators';
import { Contact, IContact } from '../_models/IContact';
import { GeoshopUtils } from '../_helpers/GeoshopUtils';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';


@Injectable({
  providedIn: 'root'
})
export class ApiOrderService {

  private apiUrl: string | undefined;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
  ) { }

  private _getApiUrl() {
    if (!this.apiUrl) {
      this.apiUrl = this.configService.config?.apiUrl;
    }
  }

  getOrder(url: string): Observable<IOrder | null> {
    this._getApiUrl();

    return !url ?
      of(null) :
      this.http.get<IOrder>(url)
        .pipe(
          catchError(() => {
            return of(null);
          })
        );
  }

  getOrderByUUID(uuid: string | undefined): Observable<Order | null> {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/download/${uuid}`);

    return this.http.get<IOrder>(url.toString())
      .pipe(
        map(iOrder => iOrder ? new Order(iOrder) : null),
        catchError(() => {
          return of(null);
        })
      );
  }

  getOrderItemByToken(token: string): Observable<IOrderItem | null> {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/validate/orderitem/${token}`);

    return this.http.get<IOrderItem>(url.toString())
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  updateOrderItemStatus(token: string, isAccepted: boolean) {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/validate/orderitem/${token}`);

    return this.http.patch<boolean>(url.toString(), {
      'is_validated': isAccepted
    }).pipe(
      map(() => {
        this.snackBar.open(
          'Décision soumise avec succès', 'Ok', {
          panelClass: 'notification-info'
        }
        );
        return true
      }),
      catchError(() => of(false))
    );
  }


  getOrderType(url: string): Observable<IOrderType | null> {
    this._getApiUrl();

    return !url ?
      of(null) :
      this.http.get<IOrderType>(url)
        .pipe(
          catchError(() => {
            return of(null);
          })
        );
  }

  getOrderTypes() {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/ordertype/`);

    return this.http.get<IApiResponse<IOrderType>>(url.toString())
      .pipe(
        map(x => x ? x.results : []),
        catchError(() => {
          return of([]);
        })
      );
  }

  getOrders(offset?: number, limit?: number, ordering?: string): Observable<IApiResponse<IOrderSummary> | null> {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/order/`);
    if (limit) {
      url.searchParams.append('limit', limit.toString());
    }
    if (offset) {
      url.searchParams.append('offset', offset.toString());
    }
    if (ordering) {
      url.searchParams.append('ordering', ordering);
    }

    return this.http.get<IApiResponse<IOrderSummary> | null>(url.toString())
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  getFullOrder(orderJson: IOrder): Observable<Order | null> {
    return zip(
      this.getContact(orderJson.invoice_contact),
    ).pipe(
      map(data => {
        const iContact = data[0];
        const order = GeoshopUtils.deepCopyOrder(orderJson);
        const newOrder = new Order(order);

        if (!iContact) {
          return newOrder;
        }

        const contact = new Contact(iContact);
        newOrder.invoiceContact = contact;

        return newOrder;
      })
    );
  }

  getLastDraft(): Observable<Order | null> {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/order/last_draft/`);

    return this.http.get<IOrder>(url.toString())
      .pipe(
        map(iOrder => iOrder ? new Order(iOrder) : null),
        catchError(() => {
          return of(null);
        })
      );
  }

  createOrder(jsonOrder: IOrderToPost, contact: Contact | undefined, isAddressForCurrentUser: boolean): Observable<IOrder | null> {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/order/`);

    return this.createOrUpdateContact(contact)
      .pipe(
        flatMap((newJsonContact) => {
          if (!isAddressForCurrentUser) {
            if (!newJsonContact) {
              return of(null);
            }
            jsonOrder.invoice_contact = GeoshopUtils.ExtractIdFromUrl((newJsonContact as IContact).url);
          }
          return this.http.post<IOrder | null>(url.toString(), jsonOrder)
            .pipe(
              catchError(() => {
                return of(null);
              })
            );
        }
        ));
  }

  updateOrder(order: Order, contact: Contact | undefined, isAddressForCurrentUser: boolean): Observable<IOrder | null> {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/order/`);

    return this.createOrUpdateContact(contact)
      .pipe(
        flatMap((newJsonContact) => {
          const orderToPost = order.toPostAsJson;

          if (!isAddressForCurrentUser) {
            if (!newJsonContact) {
              return of(null);
            }
            orderToPost.invoice_contact = GeoshopUtils.ExtractIdFromUrl((newJsonContact as IContact).url);
          }

          return this.http.put<IOrder | null>(`${url.toString()}${order.id}/`, orderToPost)
            .pipe(
              catchError(() => {
                return of(null);
              })
            );
        }
        ));
  }

  confirmOrder(orderId: number) {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/order/${orderId}/confirm/`);

    return this.http.get<boolean>(url.toString())
      .pipe(
        map(() => {
          this.snackBar.open(
            'Commande passée avec succès! Vous recevrez un email lorsque tous les téléchargements seront prêts.', 'Ok', {
            panelClass: 'notification-info'
          }
          );
          return true
        }),
        catchError(() => of(false))
      );
  }

  public downloadResult(guid: string) {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/download/${guid}/result`);

    return this.http.get(url.toString(), {
      observe: 'response',
      responseType: 'blob'
    });
  }

  public downloadOrder(orderId: number, isOrderItem = false) {
    this._getApiUrl();

    const orderText = isOrderItem ? 'orderitem' : 'order';
    const url = new URL(`${this.apiUrl}/${orderText}/${orderId}/download_link/`);

    return this.http.get<IOrderDowloadLink | null>(url.toString())
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  public downloadOrderByUUID(uuid: string) {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/download/${uuid}/get_link/`);

    return this.http.get<IOrderDowloadLink | null>(url.toString())
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  getContact(contactId: number | string) {
    this._getApiUrl();

    if (typeof contactId !== 'number' || contactId < 0) {
      return of(null);
    }
    const url = new URL(`${this.apiUrl}/contact/${contactId}/`);

    return this.http.get<IContact | null>(url.toString())
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  createOrUpdateContact(contact: Contact | undefined): Observable<IContact | null> {
    this._getApiUrl();

    if (!contact || contact.HasId) {
      // @ts-ignore
      return of(contact);
    }

    const url = new URL(`${this.apiUrl}/contact/`);

    return this.http.post<IContact | null>(url.toString(), contact)
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  updateOrderItemDataFormat(dataFormat: string, orderItemId: number): Observable<IOrderItem | null> {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/orderitem/${orderItemId}/`);

    return this.http.patch<IOrderItem | null>(url.toString(), { data_format: dataFormat })
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  updateOrderItemsDataFormats(order: Order): Observable<IOrder | null> {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/order/${order.id}/`);

    return this.http.patch<IOrder | null>(url.toString(), {
      items: order.items.map(x => {
        x.product = Order.getProductLabel(x);
        if (!x.data_format) {
          delete x.data_format;
        }
        return x;
      })
    })
      .pipe(
        catchError(() => {
          return of(null);
        })
      );
  }

  delete(orderId: number) {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/order/${orderId}/`);

    return this.http.delete<boolean>(url.toString()).pipe(
      map(() => true),
      catchError(() => {
        return of(false);
      })
    );
  }

  deleteOrderItem(orderItemId: number) {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/orderitem/${orderItemId}/`);

    return this.http.delete<boolean>(url.toString()).pipe(
      map(() => true),
      catchError(() => {
        return of(false);
      })
    );
  }

  deleteContact(contactId: number) {
    this._getApiUrl();

    const url = new URL(`${this.apiUrl}/contact/${contactId}/`);

    return this.http.delete<boolean>(url.toString()).pipe(
      map(() => true),
      catchError(() => {
        return of(false);
      })
    );
  }
}
