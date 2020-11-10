export interface IBasemap {
  id: string;
  label: string;
  description: string;
  thumbUrl: string;
  matrixSet: string;
}

export interface IConfig {
  apiUrl: string;
  mediaUrl: string;
  baseMapCapabilitiesUrl: string;
  geocoderUrl: string;
  geocoderLayers: string[];
  contact: { phone: { label: string; number: string }; email: string; };
  basemaps: Array<IBasemap>;
  initialCenter: number[];
  initialExtent: number[];
  epsg: string;
}
