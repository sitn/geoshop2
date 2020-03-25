import Polygon from 'ol/geom/Polygon';
import {getArea} from 'ol/sphere';

export class GeoHelper {
  /**
   * Format area output.
   */
  public static formatArea(polygon: Polygon): string {
    const area = getArea(polygon);
    let output;
    if (area > 10000) {
      output = (Math.round(area / 1000000 * 100) / 100) +
        ' ' + 'km2';
    } else {
      output = (Math.round(area * 100) / 100) +
        ' ' + 'm2';
    }
    return output;
  }
}
