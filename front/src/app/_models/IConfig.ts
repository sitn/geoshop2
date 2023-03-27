export interface IBasemap {
  id: string;
  label: string;
  description: string;
  thumbUrl: string;
  matrixSet: string;
  format: string;
}

export interface IConfig {
  apiUrl: string;
  mediaUrl: string;
  baseMapUrl: string;
  geocoderUrl: string;
  geocoderLayers: string[];
  contact: { phone: { label: string; number: string }; email: string; };
  basemaps: Array<IBasemap>;
  initialCenter: number[];
  initialExtent: number[];
  resolutions: number[];
  epsg: string;
  pageformats: Array<IPageFormat>;
}

export interface IPageFormat {
  name: string;
  height: number;
  width: number;
}
