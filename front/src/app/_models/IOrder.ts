// tslint:disable:variable-name

import Polygon from 'ol/geom/Polygon';
import GeoJSON from 'ol/format/GeoJSON';
import Geometry from 'ol/geom/Geometry';
import {IIdentity} from './IIdentity';
import {GeoshopUtils} from '../_helpers/GeoshopUtils';
import {Contact} from './IContact';

export interface IOrderToPost {
  id?: number;
  title: string;
  description: string;
  order_type: string;
  geom: string | undefined;
  invoice_reference?: string;
  order_contact: any;
  invoice_contact: number;
  items?: IOrderItem[];
}

export interface IOrder {
  id?: number;
  url: string;
  title: string;
  description: string;
  processing_fee_currency: string;
  processing_fee: string;
  total_with_vat_currency: string;
  total_with_vat: string;
  part_vat_currency: string;
  part_vat: string;
  invoice_reference: string;
  status: IOrderStatus;
  date_ordered: string | undefined;
  date_downloaded: string | undefined;
  date_processed: string | undefined;
  client: string | undefined;
  order_contact: string;
  invoice_contact: number;
  order_type: string;
  geom: any;
  items: Array<IOrderItem>;
}

export interface IOrderItem {
  id?: number;
  product: string;
  data_format?: string;
  available_formats?: string[];
  statusAsReadableIconText?: {
    iconName: string;
    text: string;
    color: string;
  };
}

export interface IOrderType {
  id: number;
  name: string;
}

export type IOrderStatus = 'DRAFT' | ' ARCHIVED' | 'PENDING' | 'DONE';

export class Order {
  private id?: number;
  url: string;
  title: string;
  description: string;
  processing_fee_currency: string;
  processing_fee: string;
  total_with_vat_currency: string;
  total_with_vat: string;
  part_vat_currency: string;
  part_vat: string;
  invoice_reference: string;
  status: IOrderStatus;
  date_ordered: Date | undefined;
  date_downloaded: Date | undefined;
  date_processed: Date | undefined;
  client: string | undefined;
  order_contact: string;
  invoice_contact: number;
  order_type: string;
  geom: Polygon | undefined;
  items: Array<IOrderItem>;

  orderType: IOrderType | undefined;

  private invoiceContact: Contact | undefined;

  public get HasInvoiceContact() {
    return this.invoice_contact != null;
  }

  public get InvoiceContact(): Contact | undefined {
    return this.invoiceContact;
  }

  public set InvoiceContact(contact: Contact | undefined) {
    this.invoiceContact = contact;
  }

  public get HasId() {
    return this.id && this.id > 0;
  }

  public get Id() {
    return this.id;
  }

  statusAsReadableIconText = {
    iconName: '',
    text: '',
    color: ''
  };

  get toIorder(): IOrder {
    return {
      geom: this.geom ? new GeoJSON().writeGeometry(this.geom) : undefined,
      url: this.url || '',
      id: this.id || undefined,
      client: this.client || undefined,
      date_downloaded: this.date_downloaded ? this.date_downloaded.getTime().toString() : undefined,
      date_ordered: this.date_ordered ? this.date_ordered.getTime().toString() : undefined,
      date_processed: this.date_processed ? this.date_processed.getTime().toString() : undefined,
      description: this.description,
      invoice_contact: this.invoice_contact,
      invoice_reference: this.invoice_reference,
      order_contact: this.order_contact,
      order_type: this.order_type,
      part_vat: this.part_vat,
      part_vat_currency: this.part_vat_currency,
      processing_fee: this.processing_fee,
      processing_fee_currency: this.processing_fee_currency,
      status: this.status,
      title: this.title,
      total_with_vat: this.total_with_vat,
      total_with_vat_currency: this.total_with_vat_currency,
      items: this.items
    };
  }

  get getOrderTypeId() {
    return this.orderType ? this.orderType.id : this.order_type;
  }

  get isOwnCustomer() {
    return !this.invoiceContact;
  }

  get geometryAsGeoJson(): string | undefined {
    return this.geom ? new GeoJSON().writeGeometry(this.geom) : undefined;
  }

  constructor(iOrder?: IOrder | null) {
    if (iOrder) {
      this.id = iOrder.id;
      this.url = iOrder.url;
      this.title = iOrder.title;
      this.description = iOrder.description;
      this.processing_fee_currency = iOrder.processing_fee_currency;
      this.processing_fee = iOrder.processing_fee;
      this.total_with_vat_currency = iOrder.total_with_vat_currency;
      this.total_with_vat = iOrder.total_with_vat;
      this.part_vat_currency = iOrder.part_vat_currency;
      this.part_vat = iOrder.part_vat;
      this.invoice_reference = iOrder.invoice_reference;
      this.status = iOrder.status;
      this.date_ordered = iOrder.date_ordered ? new Date(iOrder.date_ordered) : undefined;
      this.date_downloaded = iOrder.date_downloaded ? new Date(iOrder.date_downloaded) : undefined;
      this.date_processed = iOrder.date_processed ? new Date(iOrder.date_processed) : undefined;
      this.client = iOrder.client;
      this.order_contact = iOrder.order_contact;
      this.invoice_contact = iOrder.invoice_contact;
      this.order_type = iOrder.order_type;
      this.items = iOrder.items;
      this.initializeGeometry(iOrder.geom);
    } else {
      this.id = undefined;
      this.url = '';
      this.title = '';
      this.description = '';
      this.processing_fee_currency = '';
      this.processing_fee = '';
      this.total_with_vat_currency = '';
      this.total_with_vat = '';
      this.part_vat_currency = '';
      this.part_vat = '';
      this.invoice_reference = '';
      this.status = 'DRAFT';
      this.date_ordered = undefined;
      this.date_downloaded = undefined;
      this.date_processed = undefined;
      this.client = '';
      this.order_contact = '';
      this.invoice_contact = -1;
      this.order_type = '';
      this.items = [];
      this.geom = undefined;
    }

    this.initializeId();
    this.initializeStatus();
  }

  public deepInitialize(invoiceContact: Contact | undefined) {
    this.invoiceContact = invoiceContact;
  }

  private initializeId() {
    if (!this.HasId) {
      this.id = GeoshopUtils.ExtractIdFromUrl(this.url);
    }
  }

  private initializeGeometry(geom: Geometry) {
    try {
      if (geom instanceof Polygon) {
        this.geom = geom;
      } else {
        const geo = new GeoJSON().readGeometry(geom);
        if (geo instanceof Polygon) {
          this.geom = geo;
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  private initializeStatus() {
    if (this.status === 'PENDING') {
      this.statusAsReadableIconText = {
        iconName: 'warning',
        text: `Devis réalisé, en attente de validation de votre part</span></div>`,
        color: 'paleorange'
      };
    } else if (this.status === 'DRAFT') {
      this.statusAsReadableIconText = {
        text: `Brouillon`,
        iconName: 'info',
        color: 'paleblue'
      };
    } else {
      this.statusAsReadableIconText = {
        text: `Traitée`,
        iconName: 'check_outline',
        color: '#2bae66'
      };
    }
  }
}
