import {IMetadata} from './IMetadata';

export interface IProduct {
  url: string;
  label: string;
  status: string;
  order: number;
  metadata?: string;
  group: any;
  thumbnail_link: string;
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
  public readonly thumbnail_link: string;

  public metadataObject: IMetadata;

  public get Price() {
    return `Gratuit`;
  }

  constructor(args: IProduct) {
    Object.assign(this, args);
  }
}
