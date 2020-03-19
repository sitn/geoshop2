export interface IBasemap {
  id: number;
  label: string;
  description: string;
  gisServiceType: string;
  thumbUrl: string;
  url: string;
  isPublic: boolean;
}

export interface IConfig {
  apiUrl: string;
  contact: { phone: { label: string; number: string }; email: string; };
  basemaps: Array<IBasemap>;
}
