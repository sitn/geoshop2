// tslint:disable:variable-name

import Polygon from 'ol/geom/Polygon';
import GeoJSON from 'ol/format/GeoJSON';
import Geometry from 'ol/geom/Geometry';
import {Contact} from './IContact';
import {PricingStatus} from './IPricing';

export interface IOrderType {
  id: number;
  name: string;
}

export interface IStatusAsReadableIcon {
  iconName: string;
  text: string;
  color: string;
}

export type OrderStatus = 'DRAFT' | 'PENDING' | 'READY' |
  'PARTIALLY_DELIVERED' | 'PROCESSED' | 'DOWNLOADED' |
  'ARCHIVED' | 'REJECTED';

export interface IOrderItem {
  id?: number;
  price: string;
  data_format?: string;
  product: string;
  available_formats?: string[];
  srid: number;
  price_status: PricingStatus;
  /** id of the order   */
  order?: number;
}

export interface IOrderToPost {
  id?: number;
  order_type: string;
  title: string;
  description: string;
  total_without_vat: string;
  total_with_vat: string;
  geom: string | undefined;
  invoice_reference?: string;
  invoice_contact: number;
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
  status: OrderStatus;
  date_ordered: string | undefined;
  date_processed: string | undefined;
  statusAsReadableIconText?: IStatusAsReadableIcon;
  id?: number;
}

/**
 * Result for a get on the api
 * ex: https://sitn.ne.ch/geoshop2_prepub_api/order/11710/
 */
export interface IOrder {
  id: number;
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
  status: OrderStatus;
  date_ordered: string | undefined;
  date_processed: string | undefined;
  invoice_contact: string | number;
}

export class Order {
  id: number;
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
  status: OrderStatus;
  date_ordered: Date | undefined;
  date_processed: Date | undefined;
  invoice_contact: number;

  statusAsReadableIconText: IStatusAsReadableIcon;

  private _invoiceContact: Contact | undefined;
  get invoiceContact(): Contact | undefined {
    return this._invoiceContact;
  }

  set invoiceContact(contact: Contact | undefined) {
    this._invoiceContact = contact;
    this.invoice_contact = contact ? contact.Id : -1;
  }

  get HasInvoiceContact() {
    return this.invoice_contact > -1;
  }

  get geometryAsGeoJson(): string {
    return new GeoJSON().writeGeometry(this.geom);
  }

  get toPostAsJson(): IOrderToPost {
    return {
      id: this.id,
      description: this.description,
      geom: this.geometryAsGeoJson,
      invoice_contact: this.invoice_contact,
      invoice_reference: this.invoice_reference,
      order_type: this.order_type,
      title: this.title,
      total_with_vat: this.total_with_vat,
      total_without_vat: this.total_without_vat,
      items: this.items.map(x => {
        const item: IOrderItem = Object.assign({}, x);
        if (!item.data_format) {
          delete item.data_format;
        }
        return item;
      })
    };
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
      items: this.items,
      order_type: this.order_type,
      part_vat: this.part_vat,
      part_vat_currency: this.part_vat_currency,
      processing_fee: this.processing_fee,
      processing_fee_currency: this.processing_fee_currency,
      status: this.status,
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

    this.initializeGeometry(options.geom);
    this.statusAsReadableIconText = Order.initializeStatus(options);
  }

  public static initializeStatus(order: IOrderSummary | IOrder) {
    let result: IStatusAsReadableIcon = {
      iconName: '',
      text: '',
      color: ''
    };
    if (order.status === 'PENDING') {
      result = {
        iconName: 'warning',
        text: `Devis réalisé, en attente de validation de votre part</span></div>`,
        color: 'paleorange'
      };
    } else if (order.status === 'DRAFT') {
      result = {
        text: `Brouillon`,
        iconName: 'info',
        color: 'paleblue'
      };
    } else {
      result = {
        text: `Traitée`,
        iconName: 'check_outline',
        color: '#2bae66'
      };
    }
    return result;
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
