// tslint:disable:variable-name

import {IProduct} from './IProduct';
import {IFormat} from './IFormat';
import Polygon from 'ol/geom/Polygon';
import GeoJSON from 'ol/format/GeoJSON';

export interface IOrder {
  id: string;
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
  status: string;
  date_ordered: string;
  date_downloaded: string;
  date_processed: string;
  client: string;
  order_contact: string;
  invoice_contact: string;
  order_type: string;
  geometry: any;
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

export class Order {
  id: string;
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
  status: string;
  date_ordered: Date | null;
  date_downloaded: Date | null;
  date_processed: Date | null;
  client: string;
  order_contact: string;
  invoice_contact: string;
  order_type: string;
  geometry: Polygon;

  orderItems: Array<IOrderItem> = new Array<IOrderItem>(3);
  statusAsReadableIconText = {
    iconName: '',
    text: '',
    color: ''
  };

  constructor(iOrder: IOrder) {
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
    this.date_ordered = iOrder.date_ordered ? new Date(iOrder.date_ordered) : null;
    this.date_downloaded = iOrder.date_downloaded ? new Date(iOrder.date_downloaded) : null;
    this.date_processed = iOrder.date_processed ? new Date(iOrder.date_processed) : null;
    this.client = iOrder.client;
    this.order_contact = iOrder.order_contact;
    this.invoice_contact = iOrder.invoice_contact;
    this.order_type = iOrder.order_type;

    if (!this.id && this.url) {
      if (this.url.endsWith('/')) {
        this.url = this.url.substr(0, this.url.length - 1);
      }
      const temp = this.url.split('/');
      this.id = temp[temp.length - 1];
    }

    try {
      const geo = new GeoJSON().readGeometry(
        iOrder.geometry
        || '{"type":"Polygon","coordinates":[[[751146.5303508958,5937059.798145284],[785268.016978191,5938649.692065892],[783433.5282993467,5914679.037196454],[746866.056766926,5914067.540970172],[751146.5303508958,5937059.798145284]]]}'
      );
      if (geo instanceof Polygon) {
        this.geometry = geo;
      }
    } catch (error) {
      console.log(error);
    }

    if (this.status === 'PENDING') {
      this.statusAsReadableIconText = {
        iconName: 'warning',
        text: `Devis réalisé, en attente de validation de votre part</span></div>`,
        color: 'paleorange'
      };
    } else {
      this.statusAsReadableIconText = {
        text: `Traitée`,
        iconName: 'check_outline',
        color: 'palegreen'
      };
    }


    for (let i = 0; i < 50; i++) {
      this.orderItems.push({
        id: 'id_' + i,
        last_download: new Date(),
        product: {
          url: 'https://sitn.ne.ch/geoshop2_dev/product/1/',
          label: 'GE18 - Cadastre des surfaces de limitation d\'obstacle - couloirs',
          status: 'PUBLISHED',
          order: 249,
          group: null,
        },
        format: undefined,
        order: iOrder,
        statusAsReadableIconText: i === 0 ? {
          text: `Traitée`,
          iconName: 'check_outline',
          color: 'palegreen'
        } : i === 1 ? {
          iconName: 'warning',
          text: `Validée, en traitement`,
          color: 'orange'
        } : {
          iconName: 'cancel',
          text: `Annulée, <a class="text-error" href="#" target="_blank">cliquer ici pour plus d'informations</a>`,
          color: 'palevioletred'
        }
      });
    }
  }
}
