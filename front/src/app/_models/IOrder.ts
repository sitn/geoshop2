// tslint:disable:variable-name

import {IProduct} from './IProduct';
import {IFormat} from './IFormat';
import Polygon from 'ol/geom/Polygon';
import GeoJSON from 'ol/format/GeoJSON';
import Geometry from 'ol/geom/Geometry';
import {IIdentity} from './IIdentity';

export interface IOrder {
  id?: string;
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
  client: string;
  order_contact: string;
  invoice_contact: string;
  order_type: string;
  geom: any;
}

export interface IOrderItem {
  id: string;
  product: IProduct;
  order?: IOrder;
  format?: IFormat;
  last_download?: Date;
  statusAsReadableIconText: {
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
  id?: string;
  url: string;
  title: string;
  description: string;
  processing_fee_currency: string;
  processing_fee: number;
  total_cost_currency: string;
  total_cost: number;
  part_vat_currency: string;
  part_vat: number;
  invoice_reference: string;
  status: IOrderStatus;
  date_ordered: Date | undefined;
  date_downloaded: Date | undefined;
  date_processed: Date | undefined;
  client: string;
  order_contact: string;
  invoice_contact: string;
  order_type: string;
  geom: Polygon | undefined;

  orderType: IOrderType;
  clientIdentity: IIdentity;
  invoiceContact: IIdentity;
  orderContact: IIdentity;
  orderItems: Array<IOrderItem> = new Array<IOrderItem>();

  statusAsReadableIconText = {
    iconName: '',
    text: '',
    color: ''
  };

  get toIorder(): IOrder {
    return {
      geom: this.geom ? new GeoJSON().writeGeometry(this.geom) : undefined,
      url: this.url,
      id: this.id,
      client: this.client,
      date_downloaded: this.date_downloaded ? this.date_downloaded.getTime().toString() : undefined,
      date_ordered: this.date_ordered ? this.date_ordered.getTime().toString() : undefined,
      date_processed: this.date_processed ? this.date_processed.getTime().toString() : undefined,
      description: this.description,
      invoice_contact: this.invoice_contact,
      invoice_reference: this.invoice_reference,
      order_contact: this.order_contact,
      order_type: this.order_type,
      part_vat: this.part_vat.toString(),
      part_vat_currency: this.part_vat_currency,
      processing_fee: this.processing_fee.toString(),
      processing_fee_currency: this.processing_fee_currency,
      status: this.status,
      title: this.title,
      total_cost: this.total_cost.toString(),
      total_cost_currency: this.total_cost_currency
    };
  }

  get getOrderTypeId() {
    return this.orderType ? this.orderType.id : this.order_type;
  }

  get isOwnCustomer() {
    return this.orderContact && this.invoiceContact ? this.orderContact.url === this.invoiceContact.url : false;
  }

  constructor(iOrder?: IOrder) {
    if (iOrder) {
      this.id = iOrder.id;
      this.url = iOrder.url;
      this.title = iOrder.title;
      this.description = iOrder.description;
      this.processing_fee_currency = iOrder.processing_fee_currency;
      this.processing_fee = parseFloat(iOrder.processing_fee);
      this.total_cost_currency = iOrder.total_cost_currency;
      this.total_cost = parseFloat(iOrder.total_cost);
      this.part_vat_currency = iOrder.part_vat_currency;
      this.part_vat = parseFloat(iOrder.part_vat);
      this.invoice_reference = iOrder.invoice_reference;
      this.status = iOrder.status;
      this.date_ordered = iOrder.date_ordered ? new Date(iOrder.date_ordered) : undefined;
      this.date_downloaded = iOrder.date_downloaded ? new Date(iOrder.date_downloaded) : undefined;
      this.date_processed = iOrder.date_processed ? new Date(iOrder.date_processed) : undefined;
      this.client = iOrder.client;
      this.order_contact = iOrder.order_contact;
      this.invoice_contact = iOrder.invoice_contact;
      this.order_type = iOrder.order_type;
      this.initializeGeometry(iOrder.geom);
    } else {
      this.id = '';
      this.url = '';
      this.title = '';
      this.description = '';
      this.processing_fee_currency = '';
      this.processing_fee = -1;
      this.total_cost_currency = '';
      this.total_cost = -1;
      this.part_vat_currency = '';
      this.part_vat = -1;
      this.invoice_reference = '';
      this.status = 'DRAFT';
      this.date_ordered = undefined;
      this.date_downloaded = undefined;
      this.date_processed = undefined;
      this.client = '';
      this.order_contact = '';
      this.invoice_contact = '';
      this.order_type = '';
      this.geom = undefined;
    }

    this.initializeId();
    this.initializeStatus();
  }

  public deepInitialize(orderType: IOrderType, client: IIdentity, invoiceContact: IIdentity, orderContact: IIdentity) {
    this.orderType = orderType;
    this.clientIdentity = client;
    this.invoiceContact = invoiceContact;
    this.orderContact = orderContact;
  }

  private initializeId() {
    if (!this.id && this.url) {
      if (this.url.endsWith('/')) {
        this.url = this.url.substr(0, this.url.length - 1);
      }
      const temp = this.url.split('/');
      this.id = temp[temp.length - 1];
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
        color: 'palegreen'
      };
    }
  }
}
