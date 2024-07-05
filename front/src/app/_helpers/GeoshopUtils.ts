import {IOrder, IOrderItem} from '../_models/IOrder';
import {IProduct} from '../_models/IProduct';

export class GeoshopUtils {

  /**
   * Try to get the id from an url
   * The id is located in the end
   */
  public static ExtractIdFromUrl(url?: string): number {
    let id = -1;

    try {
      if (url) {
        if (url.endsWith('/')) {
          url = url.substr(0, url.length - 1);
        }
        const temp = url.split('/');
        id = parseInt(temp[temp.length - 1], 10);
      }
    } catch {
      id = -1;
    }
    return id;
  }

  public static deepCopyOrder(order: IOrder): IOrder {
    const newOrder: IOrder = {
      id: -1,
      total_with_vat_currency: '',
      total_with_vat: '',
      title: '',
      order_status: 'DRAFT',
      processing_fee_currency: '',
      processing_fee: '',
      part_vat_currency: '',
      part_vat: '',
      order_type: '',
      invoice_reference: '',
      email_deliver: '',
      invoice_contact: -1,
      description: '',
      date_processed: undefined,
      date_ordered: undefined,
      items: [],
      total_without_vat_currency: '',
      total_without_vat: '',
      geom: undefined
    };

    for (const attr in order) {
      if (attr === 'items') {
        for (const item of order.items) {
          let newProduct: IProduct | string;
          if (typeof item.product === 'string') {
            newProduct = item.product;
          } else {
            newProduct = Object.assign({}, item.product);
          }
          const newItem: IOrderItem = {
            product: newProduct,
            product_id: item.product_id,
            data_format: item.data_format,
            available_formats: item.available_formats,
            id: item.id,
            order: item.order,
            price: item.price,
            price_status: item.price_status,
            srid: item.srid,
            status: item.status,
          };
          newOrder.items.push(newItem);
        }
      } else {
        newOrder[attr] = order[attr];
      }
    }

    return newOrder;
  }

  public static downloadData(url: string, filename: string) {
    try {
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.setAttribute('style', 'display: none');
      a.href = url;
      a.download = filename;
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
    }
  }
}
