import {Component, ElementRef, HostBinding, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {Store} from '@ngrx/store';
import {AppState} from '../../_store';
import * as AuthActions from '../../_store/auth/auth.action';
import {ICredentials} from '../../_models/IIdentity';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'gs2-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {

  @HostBinding('class') class = 'main-container';

  form: FormGroup = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });

  get username() {
    return this.form.get('username');
  }

  get password() {
    return this.form.get('password');
  }

  private callbackUrl: string;
  private hasClickOnLogin = false;

  constructor(private store: Store<AppState>, private route: ActivatedRoute,
              private el: ElementRef) {
    this.route.queryParams.subscribe(queryParams => {
      this.callbackUrl = queryParams.callback;
    });
  }

  ngOnInit(): void {
    const input = this.el.nativeElement.querySelector('[formcontrolname="username"]');
    if (input && input instanceof HTMLInputElement) {
      input.focus();
    }
  }

  submit() {
    if (this.form.valid) {
      const payload: { credentials: ICredentials, callbackUrl: string } = {
        credentials: {
          username: this.username?.value,
          password: this.password?.value
        },
        callbackUrl: this.callbackUrl,
      };
      this.hasClickOnLogin = true;
      this.store.dispatch(AuthActions.login(payload));
    }
  }
}
