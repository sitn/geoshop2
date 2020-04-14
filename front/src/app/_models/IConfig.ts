export interface IBasemap {
  id: string;
  label: string;
  description: string;
  thumbUrl: string;
  matrixSet: string;
}

export interface IConfig {
  apiUrl: string;
  baseMapCapabilitiesUrl: string;
  contact: { phone: { label: string; number: string }; email: string; };
  basemaps: Array<IBasemap>;
  initialCenter: number[];
  initialExtent: number[];
  epsg: string;
}
