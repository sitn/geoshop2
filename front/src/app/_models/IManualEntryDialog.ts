import {IPageFormat} from './IConfig';

export interface IManualEntryDialogData {
  selectedPageFormatScale: number;
  pageFormatScales: Array<number>;
  selectedPageFormat: IPageFormat;
  pageFormats: Array<IPageFormat>;
  PageFormatRotation: number;
  rotationPageFormat: number;
  activeTab: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}
