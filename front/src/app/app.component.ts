import {Component} from '@angular/core';
import {AppState, selectProductTotal} from './_store';
import {Store} from '@ngrx/store';

@Component({
  selector: 'gs2-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'front';

  numberOfItemInTheCart$ = this.store.select(selectProductTotal);

  constructor(private store: Store<AppState>) {
  }
}
