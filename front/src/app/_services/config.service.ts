import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IConfig } from '../_models/IConfig';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private config: IConfig;

  public get Basemaps() {
    return this.config ? this.config.basemaps : [];
  }

  constructor(private http: HttpClient) { }

  async load() {
    try {
      this.config = await this.http.get<IConfig>('assets/configs/config.json').toPromise();
    } catch (error) {
      console.error(error);
    }
  }
}
