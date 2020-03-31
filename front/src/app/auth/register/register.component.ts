import {Component, HostBinding, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {AppState} from '../../_store';
import {Store} from '@ngrx/store';
import {ICredentials} from '../../_models/IIdentity';
import * as AuthActions from '../../_store/auth/auth.action';
import {ApiService} from '../../_services/api.service';
import {map} from 'rxjs/operators';

@Component({
  selector: 'gs2-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  @HostBinding('class') class = 'main-container dark-background';

  form: FormGroup = new FormGroup({
    username: new FormControl('', {
      validators: Validators.required,
      asyncValidators: async () => this.loginMatchValidator,
      updateOn: 'blur'
    }),
    passwords: new FormGroup({
      password: new FormControl('', Validators.required),
      passwordConfirm: new FormControl('', Validators.required),
    }, RegisterComponent.passwordMatchValidator)
  });

  get username() {
    return this.form.get('username');
  }

  get passwords() {
    return this.form.get('passwords');
  }

  get password() {
    return this.form.get('passwords')?.get('password');
  }

  get passwordConfirm() {
    return this.form.get('passwords')?.get('passwordConfirm');
  }

  constructor(private store: Store<AppState>, private apiService: ApiService) {
  }

  private static passwordMatchValidator(g: FormGroup) {
    const passValue = g.get('password')?.value;
    const passConfirmValue = g.get('passwordConfirm')?.value;
    return passValue === passConfirmValue ? null : {mismatch: true};
  }

  ngOnInit(): void {
  }

  submit() {
    if (this.form.valid) {
      const payload: { credentials: ICredentials; callbackUrl: string; } = {
        credentials: {
          username: this.username?.value,
          password: this.password?.value
        },
        callbackUrl: 'account'
      };
      this.store.dispatch(AuthActions.login(payload));
    }
  }


  private loginMatchValidator(g: FormGroup) {
    return this.apiService.checkLoginNotTaken(g.value && g.value.length > 0 && g.value.toLowerCase())
      .pipe(
        map(isAvailable => {
          return isAvailable.result ? {duplicate: true} : null;
        }));
  }
}
