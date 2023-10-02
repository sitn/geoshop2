import {AfterViewInit, Component, ElementRef, HostBinding, OnInit, ViewChild} from '@angular/core';
import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {AppState} from '../../_store';
import {Store} from '@ngrx/store';
import {IIdentity} from '../../_models/IIdentity';
import {ApiService} from '../../_services/api.service';
import {map} from 'rxjs/operators';
import {Router} from '@angular/router';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {StepperSelectionEvent} from '@angular/cdk/stepper';
import {PHONE_REGEX, IDE_REGEX} from '../../_helpers/regex';

@Component({
  selector: 'gs2-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, AfterViewInit {

  @HostBinding('class') class = 'main-container';
  @ViewChild('firstInput') firstInput: ElementRef;
  startDate: Date;

  formCredentials = new UntypedFormGroup({
    passwords: new UntypedFormGroup({
      password: new UntypedFormControl('', Validators.required),
      passwordConfirm: new UntypedFormControl('', Validators.required),
    }, RegisterComponent.passwordMatchValidator),
    username: new UntypedFormControl('', {
      validators: Validators.required,
      asyncValidators: async () => this.loginMatchValidator,
      updateOn: 'blur'
    }),
  });
  formContact = new UntypedFormGroup({
    firstName: new UntypedFormControl('', Validators.required),
    lastName: new UntypedFormControl('', Validators.required),
    email: new UntypedFormControl('', Validators.compose([Validators.required, Validators.email])),
    phone: new UntypedFormControl('', Validators.compose([Validators.pattern(PHONE_REGEX)])),
  });
  ideValidators = [Validators.pattern(IDE_REGEX)];
  formAddress = new UntypedFormGroup({
    companyName: new UntypedFormControl(''),
    ideId: new UntypedFormControl('', this.ideValidators),
    street: new UntypedFormControl('', Validators.required),
    street2: new UntypedFormControl(''),
    postcode: new UntypedFormControl('', Validators.required),
    city: new UntypedFormControl('', Validators.required),
    country: new UntypedFormControl('Suisse', Validators.required),
    birthDay: new UntypedFormControl(''),
  });

  get passwords() {
    return this.formCredentials.get('passwords');
  }

  get username() {
    return this.formCredentials.get('username');
  }

  get firstName() {
    return this.formContact.get('firstName');
  }

  get lastName() {
    return this.formContact.get('lastName');
  }

  get email() {
    return this.formContact.get('email');
  }

  get street() {
    return this.formAddress.get('street');
  }

  get street2() {
    return this.formAddress.get('street2');
  }

  get postcode() {
    return this.formAddress.get('postcode');
  }

  get city() {
    return this.formAddress.get('city');
  }

  get country() {
    return this.formAddress.get('country');
  }

  get companyName() {
    return this.formAddress.get('companyName');
  }

  get ideId() {
    return this.formAddress.get('ideId');
  }

  get phone() {
    return this.formContact.get('phone');
  }

  get birthDay() {
    if (this.formAddress.get('birthDay')?.value) {
      return this.formAddress.get('birthDay')?.value.toISOString().slice(0, 10);
    }
    return null;
  }

  get password() {
    return this.formCredentials.get('passwords')?.get('password');
  }

  get passwordConfirm() {
    return this.formCredentials.get('passwords')?.get('passwordConfirm');
  }

  constructor(private store: Store<AppState>, private apiService: ApiService,
              private router: Router,
              private snackBar: MatSnackBar
  ) {
  }

  private static passwordMatchValidator(g: UntypedFormGroup) {
    const passValue = g.get('password')?.value;
    const passConfirmValue = g.get('passwordConfirm')?.value;
    return passValue === passConfirmValue ? null : {mismatch: true};
  }

  ngOnInit(): void {
    this.startDate = new Date();
    this.startDate.setFullYear( this.startDate.getFullYear() - 35 );
  }

  ngAfterViewInit(): void {
    if (this.firstInput) {
      setTimeout(() => {
        this.firstInput.nativeElement.focus();
      }, 50);
    }
  }

  submit() {
    if (this.formCredentials.valid && this.formContact.valid && this.formAddress.valid) {
      const user: IIdentity = {
        password1: this.password?.value,
        password2: this.passwordConfirm?.value,
        username: this.username?.value,
        first_name: this.firstName?.value,
        last_name: this.lastName?.value,
        email: this.email?.value,
        street: this.street?.value,
        street2: this.street2?.value,
        postcode: this.postcode?.value,
        city: this.city?.value,
        country: this.country?.value,
        company_name: this.companyName?.value,
        ide_id: this.ideId?.value,
        phone: this.phone?.value,
        birthday: this.birthDay,
      };
      this.apiService.register(user)
        .subscribe(async (res) => {
          if (res) {
            this.snackBar.open('Le compte est en cours de validation. Vous recevrez un courriel de confirmation sous peu.',
              'Ok', {
                panelClass: 'notification-success'
              });
            await this.router.navigate(['/auth/login']);
          } else {
            this.formCredentials.markAsDirty();
            this.formContact.markAsDirty();
            this.formAddress.markAsDirty();
          }
        });
    }
  }


  private loginMatchValidator(g: UntypedFormGroup) {
    return this.apiService.checkLoginNotTaken(g.value && g.value.length > 0 && g.value.toLowerCase())
      .pipe(
        map(response => {
          return response ?
            response.result ? {duplicate: true} : null :
            null;
        }));
  }

  setFocusOn(event: StepperSelectionEvent) {
    const input = document.getElementById(`registerInput${event.selectedIndex}`);
    if (input) {
      setTimeout(() => {
        input.focus();
      }, 400);
    }
  }

}
