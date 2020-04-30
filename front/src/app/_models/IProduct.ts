import {IMetadata} from './IMetadata';

export interface IProduct {
  url: string;
  label: string;
  status: string;
  order: number;
  metadata?: string;
  group: any;
}

export class Product {
  public readonly url: string;
  public readonly label: string;
  public readonly status: string;
  public readonly order: number;
  /*
  Url of the metadata
   */
  public readonly metadata: string;
  public readonly group: any;

  public metadataObject: IMetadata;

  public get Price() {
    return `Gratuit`;
  }

  constructor(args: IProduct) {
    Object.assign(this, args);
  }
}
