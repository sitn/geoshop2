// tslint:disable:variable-name

import {IMetadata} from './IMetadata';

export interface IProduct {
  url: string;
  label: string;
  status: string;
  provider: string;
  order: number;
  thumbnail_link: string;
  /**
   * Metadata url
   */
  metadata: string;
  group: any;
  /**
   * Princing url
   */
  pricing: string;
}

export class Product {
  url: string;
  label: string;
  status: string;
  provider: string;
  order: number;
  thumbnail_link: string;
  metadata: string;
  pricing: string;
  group: any;

  metadataObject: IMetadata;

  constructor(args: IProduct) {
    if (args) {
      Object.assign(this, args);
    }
  }
}
