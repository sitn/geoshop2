import {Component, HostBinding, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ApiService} from '../../_services/api.service';
import {catchError, takeUntil} from 'rxjs/operators';
import {of, Subject} from 'rxjs';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'gs2-reset',
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss']
})
export class ResetComponent implements OnInit, OnDestroy {

  @HostBinding('class') class = 'main-container dark-background';

  private onDestroy$ = new Subject<void>();

  private resetToken: string;
  private successMessage = 'Votre nouveau mot de passe a bien été pris en compte. Vous pouvez vous authentifier.';

  passwords = new FormGroup({
    password: new FormControl('', Validators.required),
    passwordConfirm: new FormControl('', Validators.required),
  }, this.passwordMatchValidator);

  get password() {
    return this.passwords.get('password');
  }

  get passwordConfirm() {
    return this.passwords.get('passwordConfirm');
  }

  constructor(private apiService: ApiService, private snackBar: MatSnackBar,
              private router: Router, private route: ActivatedRoute) {
    this.route.queryParams
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(params => {
        this.resetToken = params.token;
      });
  }

  ngOnInit(): void {
  }

  submit() {
    if (this.passwords.valid) {
      this.apiService.resetPassword(this.resetToken, this.password?.value)
        .pipe(
          catchError(errorXhr => {
            this.snackBar.open(errorXhr.error.error.message, 'Ok', {panelClass: 'notification-error'});
            return of(false);
          })
        )
        .subscribe(async (result) => {
          if (!result) {
            return;
          } else {
            await this.router.navigate(['/auth/login']);
            this.snackBar.open(this.successMessage, 'Ok', {panelClass: 'notification-success'});
          }
        });
    }
  }

  private passwordMatchValidator(g: FormGroup) {
    const passValue = g.get('password')?.value;
    const passConfirmValue = g.get('passwordConfirm')?.value;
    return passValue === passConfirmValue ? null : {mismatch: true};
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
  }

}
