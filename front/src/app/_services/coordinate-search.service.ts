import { formatNumber } from '@angular/common';
import { Injectable } from '@angular/core';
import { LOCALE_ID, Inject } from '@angular/core';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {EPSG2056_COORD_REGEX} from '../_helpers/regex';

@Injectable({
    providedIn: 'root'
})

export class CoordinateSearchService {
    constructor(
        @Inject(LOCALE_ID) public locale: string
    ) { }

    /**
     * Parse a string and return a coordinate if the result is valid. Given string
     * must be a two numbers separated by a space.
     * @param inputText the string to parse.
     * @return A coordinate or null if the format is not valid.
     */
    stringCoordinatesToFeature(inputText: string): Feature | null {
        const coords = inputText.match(EPSG2056_COORD_REGEX);
        if (coords) {
            const est = parseFloat(coords[1].replace(/'/g, ''));
            const nord = parseFloat(coords[2].replace(/'/g, ''));
            if (!isNaN(est) && !isNaN(nord)) {
                const feature = new Feature({
                    geometry: new Point([est, nord]),
                    layer_name: 'recenter_to',
                    label: `${formatNumber(est, this.locale)} / ${formatNumber(nord, this.locale)}`
                });
                return feature;
            }
        }
        return null;
    }
}
