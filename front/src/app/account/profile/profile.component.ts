import {Component, HostBinding, OnDestroy, OnInit} from '@angular/core';
import {ApiService} from '../../_services/api.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {IUser, IUserChangeResponse, IUserToPost} from '../../_models/IUser';
import {PHONE_REGEX} from '../../_helpers/regex';
import {IApiResponseError} from '../../_models/IApi';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'gs2-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  @HostBinding('class') class = 'main-container';

  user: IUser;
  isEditionMode = false;

  form = new FormGroup({
    first_name: new FormControl('', Validators.required),
    last_name: new FormControl('', Validators.required),
    email: new FormControl('', Validators.compose([Validators.required, Validators.email])),
    phone: new FormControl('', Validators.compose([Validators.required, Validators.pattern(PHONE_REGEX)])),
    company_name: new FormControl('', Validators.required),
    street: new FormControl(),
    street2: new FormControl(),
    postcode: new FormControl(),
    city: new FormControl(),
    country: new FormControl(),
  });

  get companyName() {
    return this.form.get('company_name');
  }

  get firstName() {
    return this.form.get('first_name');
  }

  get lastName() {
    return this.form.get('last_name');
  }

  get email() {
    return this.form.get('email');
  }

  get phone() {
    return this.form.get('phone');
  }

  constructor(private apiService: ApiService, private snackBar: MatSnackBar) {
  }

  ngOnInit(): void {
    this.apiService.getProfile()
      .subscribe(user => {
        this.user = user;
        this.updateForm(this.user);
      });
  }

  updateForm(user: IUser) {
    this.form.reset({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      street: user.street,
      street2: user.street2,
      postcode: user.postcode,
      city: user.city,
      country: user.country,
      company_name: user.company_name,
      phone: user.phone,
    });
  }

  editUser() {
    if (this.form.invalid || this.form.pristine) {
      return;
    }

    const editedUser = this.form.value as IUserToPost;

    this.apiService.updateProfile(editedUser).subscribe(newUser => {
      if ((newUser as IApiResponseError).error) {
        this.snackBar.open(
          (newUser as IApiResponseError).message, 'Ok', {panelClass: 'notification-error'}
        );
      } else if ((newUser as IUserChangeResponse).detail) {
        this.snackBar.open(
          (newUser as IUserChangeResponse).detail, 'Ok', {panelClass: 'notification-success'}
        );
        this.isEditionMode = false;
      }
    });
  }
}
