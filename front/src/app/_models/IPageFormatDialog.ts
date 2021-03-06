import {IPageFormat} from '../_models/IConfig';

export interface IPageFormatDialogData {
  selectedPageFormatScale: number;
  pageFormatScales: Array<number>;
  selectedPageFormat: IPageFormat;
  pageFormats: Array<IPageFormat>;
  PageFormatRotation: number;
  rotationPageFormat: number;
}
