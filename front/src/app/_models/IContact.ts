// tslint:disable:variable-name
import {GeoshopUtils} from '../_helpers/GeoshopUtils';

export interface IContact {
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  url?: string;
  street?: string;
  street2?: string;
  postcode?: string;
  city?: string;
  country?: string;
  phone?: string;
  sap_id?: string;

  [key: string]: any;
}

export class Contact {
  [key: string]: any;

  url: string;
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  street?: string;
  street2?: string;
  postcode?: string;
  city?: string;
  country?: string;
  phone?: string;
  sap_id?: string;

  private id: number;

  public get Id() {
    return this.id;
  }

  public get HasId() {
    return this.id && this.id > -1;
  }

  constructor(props: IContact) {
    if (props) {
      Object.assign(this, props);
      this.initializeId(props.url);
    } else {
      this.initializeId();
    }
  }

  private initializeId(url?: string) {
    this.id = GeoshopUtils.ExtractIdFromUrl(url);
    if (!this.sap_id || this.sap_id === '') {
      this.sap_id = undefined;
    }
  }

}
