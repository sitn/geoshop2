import {Component, HostBinding, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppState, getUser, isLoggedIn} from '../../_store';
import * as fromAuth from '../../_store/auth/auth.action';

@Component({
  selector: 'gs2-account-overlay',
  templateUrl: './account-overlay.component.html',
  styleUrls: ['./account-overlay.component.scss']
})
export class AccountOverlayComponent implements OnInit {

  @HostBinding('class') class = 'overlay-container';

  isLoggedIn$ = this.store.select(isLoggedIn);
  user$ = this.store.select(getUser);

  constructor(private store: Store<AppState>) {
  }

  ngOnInit(): void {
  }

  logout() {
    this.store.dispatch(fromAuth.logout());
  }
}
