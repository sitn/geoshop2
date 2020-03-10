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
    basemaps: Array<IBasemap>;
}
