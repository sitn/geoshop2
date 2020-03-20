import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppState, isLoggedIn} from '../../_store';

@Component({
  selector: 'gs2-account-overlay',
  templateUrl: './account-overlay.component.html',
  styleUrls: ['./account-overlay.component.scss']
})
export class AccountOverlayComponent implements OnInit {

  isLoggedIn$ = this.store.select(isLoggedIn);

  constructor(private store: Store<AppState>) {
  }

  ngOnInit(): void {
  }

}
