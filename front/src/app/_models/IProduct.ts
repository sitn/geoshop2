// tslint:disable:variable-name

import {IMetadata} from './IMetadata';

export interface IProduct {
  id: number;
  url?: string;
  label: string;
  status?: string;
  provider?: string;
  order?: number;
  thumbnail_link?: string;
  /** Metadata url */
  metadata?: string;
  group?: any;
  /** Princing url */
  pricing?: string;
  /** Use only in the app to facilitate */
  metadataObject?: IMetadata;
}
