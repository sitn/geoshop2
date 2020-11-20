// tslint:disable:variable-name

import Polygon from 'ol/geom/Polygon';
import GeoJSON from 'ol/format/GeoJSON';
import Geometry from 'ol/geom/Geometry';
import {IIdentity} from './IIdentity';

export interface IOrderToPost {
  id?: number;
  title: string;
  description: string;
  order_type: string;
  geom: string | undefined;
  invoice_reference?: string;
  order_contact: any;
  invoice_contact: any;
  items: IOrderItem[];
}

export interface IOrder {
  id?: number;
  url: string;
  title: string;
  description: string;
  processing_fee_currency: string;
  processing_fee: string;
  total_cost_currency: string;
  total_cost: string;
  part_vat_currency: string;
  part_vat: string;
  invoice_reference: string;
  status: IOrderStatus;
  date_ordered: string | undefined;
  date_downloaded: string | undefined;
  date_processed: string | undefined;
  client: string | undefined;
  order_contact: string;
  invoice_contact: string;
  order_type: string;
  geom: any;
  items: Array<IOrderItem>;
}

export interface IOrderItem {
  id?: number;
  product: string;
  format?: string;
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
  id?: number;
  url: string;
  title: string;
  description: string;
  processing_fee_currency: string;
  processing_fee: string;
  total_cost_currency: string;
  total_cost: string;
  part_vat_currency: string;
  part_vat: string;
  invoice_reference: string;
  status: IOrderStatus;
  date_ordered: Date | undefined;
  date_downloaded: Date | undefined;
  date_processed: Date | undefined;
  client: string | undefined;
  order_contact: string;
  invoice_contact: string;
  order_type: string;
  geom: Polygon | undefined;
  items: Array<IOrderItem>;

  orderType: IOrderType | undefined;
  clientIdentity: IIdentity | undefined;
  invoiceContact: IIdentity | undefined;

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
      total_cost: this.total_cost,
      total_cost_currency: this.total_cost_currency,
      items: this.items
    };
  }

  get getOrderTypeId() {
    return this.orderType ? this.orderType.id : this.order_type;
  }

  get isOwnCustomer() {
    return this.invoiceContact ? false : true;
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
      this.total_cost_currency = iOrder.total_cost_currency;
      this.total_cost = iOrder.total_cost;
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
      this.total_cost_currency = '';
      this.total_cost = '';
      this.part_vat_currency = '';
      this.part_vat = '';
      this.invoice_reference = '';
      this.status = 'DRAFT';
      this.date_ordered = undefined;
      this.date_downloaded = undefined;
      this.date_processed = undefined;
      this.client = '';
      this.order_contact = '';
      this.invoice_contact = '';
      this.order_type = '';
      this.items = [];
      this.geom = undefined;
    }

    this.initializeId();
    this.initializeStatus();
  }

  public deepInitialize(orderType: IOrderType | undefined,
                        client: IIdentity | undefined,
                        invoiceContact: IIdentity | undefined) {
    this.orderType = orderType;
    this.clientIdentity = client;
    this.invoiceContact = invoiceContact;
  }

  private initializeId() {
    if (!this.id && this.url) {
      if (this.url.endsWith('/')) {
        this.url = this.url.substr(0, this.url.length - 1);
      }
      const temp = this.url.split('/');
      this.id = parseInt(temp[temp.length - 1], 10);
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
      console.log(error);
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
