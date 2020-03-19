import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IConfig} from '../_models/IConfig';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private config: IConfig;

  public get BaseMaps() {
    return this.config ? this.config.basemaps : [];
  }

  public get ApiUrl() {
    return this.config.apiUrl;
  }

  constructor(private http: HttpClient) {
  }

  async load() {
    try {
      this.config = await this.http.get<IConfig>('assets/configs/config.json').toPromise();
      if (this.config.apiUrl.endsWith('/')) {
        this.config.apiUrl = this.config.apiUrl.substr(0, this.config.apiUrl.length - 1);
      }
    } catch (error) {
      console.error(error);
    }
  }
}
