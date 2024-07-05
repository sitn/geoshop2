// tslint:disable:variable-name

import Polygon from 'ol/geom/Polygon';
import GeoJSON from 'ol/format/GeoJSON';
import {Contact} from './IContact';
import {PricingStatus} from './IPricing';
import {IProduct} from './IProduct';
import { IIdentity } from './IIdentity';

export interface IOrderType {
  id: number;
  name: string;
}

export interface IStatusAsReadableIcon {
  iconName: string;
  text: string;
  color: string;
}

export type OrderStatus = 'DRAFT' |
  'PENDING' |
  'QUOTE_DONE' |
  'READY' |
  'IN_EXTRACT' |
  'PARTIALLY_DELIVERED' |
  'PROCESSED' |
  'ARCHIVED' |
  'REJECTED' |
  'CONFIRM_REQUIRED';

export type OrderItemStatus = 'PENDING' |
  'IN_EXTRACT' |
  'PROCESSED' |
  'ARCHIVED' |
  'REJECTED';

export interface IOrderItem {
  product: IProduct | string;
  product_id: number;
  id?: number;
  price?: string;
  data_format?: string;
  available_formats?: string[];
  order_guid?: string;
  srid?: number;
  price_status?: PricingStatus;
  /** id of the order   */
  order?: number;
  status?: OrderItemStatus;
}

export interface IOrderToPost {
  order_type: string;
  title: string;
  description: string;
  geom: string | undefined;
  invoice_reference?: string;
  email_deliver?: string;
  invoice_contact?: number | null;
  items: IOrderItem[];
}

/**
 * Result for a get on the api (list of orders)
 * ex: https://sitn.ne.ch/geoshop2_prepub_api/order/
 */
export interface IOrderSummary {
  url: string;
  order_type: string;
  title: string;
  description: string;
  total_without_vat_currency: string;
  total_without_vat: string;
  total_with_vat_currency: string;
  total_with_vat: string;
  invoice_reference: string;
  email_deliver: string;
  order_status: OrderStatus;
  date_ordered: string | undefined;
  date_processed: string | undefined;
  statusAsReadableIconText?: IStatusAsReadableIcon;
  id?: number;
}

export interface IOrderDowloadLink {
  detail?: string;
  download_link?: string;
}

/**
 * Result for a get on the api
 * ex: https://sitn.ne.ch/geoshop2_prepub_api/order/11710/
 */
export interface IOrder {
  [key: string]: any;

  id: number;
  client?: IIdentity;
  order_type: string;
  items: Array<IOrderItem>;
  title: string;
  description: string;
  processing_fee_currency: string;
  processing_fee: string;
  total_without_vat_currency: string;
  total_without_vat: string;
  part_vat_currency: string;
  part_vat: string;
  total_with_vat_currency: string;
  total_with_vat: string;
  geom: string | undefined;
  invoice_reference: string;
  email_deliver: string;
  order_status: OrderStatus;
  date_ordered: string | undefined;
  date_processed: string | undefined;
  invoice_contact: string | number;
}

export class OrderItem {
  product: IProduct | string;
  product_id: number;
  id?: number;
  price?: string;
  data_format?: string;
  available_formats?: string[];
  order_guid?: string;
  srid?: number;
  price_status?: PricingStatus;
  /** id of the order   */
  order?: number;
  status?: OrderItemStatus;

  constructor(options: IOrderItem) {
    if (!options) {
      throw new Error('Missing argument');
    }

    Object.assign(this, options);
  }
}

export class Order {
  id: number;
  client: IIdentity;
  order_type: string;
  items: Array<IOrderItem>;
  title: string;
  description: string;
  processing_fee_currency: string;
  processing_fee: string;
  total_without_vat_currency: string;
  total_without_vat: string;
  part_vat_currency: string;
  part_vat: string;
  total_with_vat_currency: string;
  total_with_vat: string;
  geom: Polygon;
  invoice_reference: string;
  email_deliver: string;
  order_status: OrderStatus;
  date_ordered: Date | undefined;
  date_processed: Date | undefined;
  invoice_contact: number;

  statusAsReadableIconText: IStatusAsReadableIcon;
  private readonly _isAllOrderItemCalculated: boolean = true;
  get isAllOrderItemCalculated() {
    return this._isAllOrderItemCalculated;
  }

  get isQuotationCalculationFinished() {
    return this.order_status === 'QUOTE_DONE';
  }

  private _invoiceContact: Contact | undefined;
  get invoiceContact(): Contact | undefined {
    return this._invoiceContact;
  }

  set invoiceContact(contact: Contact | undefined) {
    this._invoiceContact = contact;
    this.invoice_contact = contact ? contact.Id : -1;
  }

  get HasInvoiceContact() {
    return this.invoice_contact != null && this.invoice_contact > -1;
  }

  get geometryAsGeoJson(): string {
    return new GeoJSON().writeGeometry(this.geom);
  }

  get toPostAsJson(): IOrderToPost {
    const order: IOrderToPost = {
      description: this.description,
      geom: this.geometryAsGeoJson,
      invoice_contact: this.invoice_contact,
      invoice_reference: this.invoice_reference,
      email_deliver: this.email_deliver,
      order_type: this.order_type,
      title: this.title,
      items: this.items.map(x => {
        x.product = Order.getProductLabel(x);
        if (!x.data_format) {
          delete x.data_format;
        }
        return x;
      })
    };

    if (order.invoice_contact == null || order.invoice_contact === -1) {
      delete order.invoice_contact;
    }

    return order;
  }

  get toJson(): IOrder {
    return {
      id: this.id,
      invoice_contact: this.invoice_contact,
      date_processed: this.date_processed ? this.date_processed.getTime().toString() : undefined,
      date_ordered: this.date_ordered ? this.date_ordered.getTime().toString() : undefined,
      description: this.description,
      geom: this.geometryAsGeoJson,
      invoice_reference: this.invoice_reference,
      email_deliver: this.email_deliver,
      items: this.items,
      order_type: this.order_type,
      part_vat: this.part_vat,
      part_vat_currency: this.part_vat_currency,
      processing_fee: this.processing_fee,
      processing_fee_currency: this.processing_fee_currency,
      order_status: this.order_status,
      title: this.title,
      total_with_vat: this.total_with_vat,
      total_with_vat_currency: this.total_with_vat_currency,
      total_without_vat: this.total_without_vat,
      total_without_vat_currency: this.total_without_vat_currency
    };
  }

  constructor(options: IOrder) {
    if (!options) {
      throw new Error('Missing argument');
    }

    Object.assign(this, options);

    if (options.date_ordered) {
      this.date_ordered = new Date(options.date_ordered);
    }
    if (options.date_processed) {
      this.date_processed = new Date(options.date_processed);
    }
    this.invoice_contact = typeof options.invoice_contact === 'string' ? -1 : options.invoice_contact;
    if (typeof this.id === 'string') {
      this.id = -1;
    }

    for (const item of this.items) {
      const product = item.product;
      if (typeof product === 'string') {
        item.product = {
          id: item.product_id,
          label: product
        };
      }
      this._isAllOrderItemCalculated = this._isAllOrderItemCalculated && item.price_status === 'CALCULATED';
    }

    this.initializeGeometry(options.geom);
    this.statusAsReadableIconText = Order.initializeStatus(options, this._isAllOrderItemCalculated);
  }

  public static initializeStatus(order: IOrderSummary | IOrder, isPendingConfirm: boolean = false) {
    let result: IStatusAsReadableIcon = {
      iconName: '',
      text: '',
      color: ''
    };

    switch (order.order_status) {
      case 'DRAFT':
        result = {
          text: `Brouillon`,
          iconName: 'info',
          color: '#bbb'
        };
        break;
      case 'PENDING':
        result = {
          text: 'En attente du devis',
          iconName: 'calculate',
          color: '#7593f0'
        };
        break;
      case 'QUOTE_DONE':
        result = {
          text: 'Devis réalisé, en attente de confirmation',
          iconName: 'check_outline',
          color: '#7593f0'
        };
        break;
      case 'READY':
        result = {
          text: `Extraction en cours`,
          iconName: 'info',
          color: '#7593f0'
        };
        break;
      case 'IN_EXTRACT':
        result = {
          text: `Extraction en cours`,
          iconName: 'hourglass_empty',
          color: '#7593f0'
        };
        break;
      case 'PARTIALLY_DELIVERED':
        result = {
          text: `Partiellement traitée`,
          iconName: 'hourglass_bottom',
          color: '#7593f0'
        };
        break;
      case 'PROCESSED':
        result = {
          text: `Traitée`,
          iconName: 'check_outline',
          color: '#2bae66'
        };
        break;
      case 'ARCHIVED':
        result = {
          text: `Archivée`,
          iconName: 'archive',
          color: '#000000'
        };
        break;
      case 'REJECTED':
        result = {
          text: `Annulée`,
          iconName: 'cancel',
          color: '#000000'
        };
        break;

      default:
        result = {
          text: `Etat inconnu`,
          iconName: 'info',
          color: '#E993B0'
        };
        break;
    }

    return result;
  }

  public static getProductLabel(orderItem: IOrderItem): string {
    return typeof orderItem.product === 'string' ?
      orderItem.product :
      orderItem.product.label;
  }

  private initializeGeometry(geom: string | undefined) {
    try {
      if (!geom) {
        return;
      }
      const geo = new GeoJSON().readGeometry(geom);
      if (geo instanceof Polygon) {
        this.geom = geo;
      }
    } catch (error) {
      console.error(error);
    }
  }
}
