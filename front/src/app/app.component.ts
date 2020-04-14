import {Component} from '@angular/core';
import {AppState, selectProductTotal} from './_store';
import {Store} from '@ngrx/store';
import {NavigationEnd, Router} from '@angular/router';
import {filter, map} from 'rxjs/operators';

@Component({
  selector: 'gs2-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'front';

  numberOfItemInTheCart$ = this.store.select(selectProductTotal);
  isNewOrderRoute$ = this.router.events.pipe(
    filter(evt => evt instanceof NavigationEnd),
    map((evt: NavigationEnd) => evt.url.indexOf('new-order') > -1)
  );

  constructor(private store: Store<AppState>, private router: Router) {

  }
}
