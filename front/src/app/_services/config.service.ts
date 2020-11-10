import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IConfig} from '../_models/IConfig';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  public config: IConfig;

  constructor(private http: HttpClient) {
  }

  load() {
    return new Promise(async (resolve, reject) => {
      try {
        this.config = await this.http.get<IConfig>('assets/configs/config.json').toPromise();
        if (this.config.apiUrl.endsWith('/')) {
          this.config.apiUrl = this.config.apiUrl.substr(0, this.config.apiUrl.length - 1);
        }

        resolve();
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  }
}
