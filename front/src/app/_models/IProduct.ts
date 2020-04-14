import {IMetadata} from './IMetadata';

export interface IProduct {
  url: string;
  label: string;
  status: string;
  order: number;
  metadata?: IMetadata;
  group: any;
}

export class Product {
  public readonly url: string;
  public readonly label: string;
  public readonly status: string;
  public readonly order: number;
  public readonly metadata: IMetadata;
  public readonly group: any;

  public get Price() {
    return `Gratuit`;
  }

  constructor(args: IProduct) {
    Object.assign(this, args);
  }
}
