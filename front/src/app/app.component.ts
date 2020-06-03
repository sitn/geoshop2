import {Component} from '@angular/core';
import {AppState, selectOrder, selectProductTotal} from './_store';
import {Store} from '@ngrx/store';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {combineLatest} from 'rxjs';

@Component({
  selector: 'gs2-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'front';
  subTitle = '';

  order$ = this.store.select(selectOrder);
  numberOfItemInTheCart$ = this.store.select(selectProductTotal);

  constructor(private store: Store<AppState>, private router: Router) {
    const routerNavEnd$ = this.router.events.pipe(filter(x => x instanceof NavigationEnd));

    combineLatest([routerNavEnd$, this.store.select(selectProductTotal)])
      .subscribe((pair) => {
        const navEnd = pair[0];
        const numberOfItemInTheCart = pair[1];

        if (navEnd instanceof NavigationEnd) {
          if (navEnd.url.indexOf('orders') > -1) {
            this.subTitle = `Mes commandes`;
          } else if (navEnd.url.indexOf('new-order') > -1 && numberOfItemInTheCart > 0) {
            this.subTitle = `Votre commande de ${numberOfItemInTheCart} produits`;
          } else {
            this.subTitle = '';
          }
        }
      });
  }
}
