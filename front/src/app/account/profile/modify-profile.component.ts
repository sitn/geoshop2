import {Component, HostBinding, OnInit} from '@angular/core';
import {FormControl, FormGroup, FormBuilder, Validators} from '@angular/forms';
import {of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {PHONE_REGEX} from '../../_helpers/regex';
import {ApiService} from '../../_services/api.service';
import {IIdentity} from '../../_models/IIdentity';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {IUser, IUserToPost} from '../../_models/IUser';

@Component({
  selector: 'gs2-modify-profile',
  templateUrl: './modify-profile.component.html',
  styleUrls: ['./modify-profile.component.scss']
})
export class ModifyProfileComponent implements OnInit {

  @HostBinding('class') class = 'main-container';

  formModifyUser = new FormGroup({});
  user: IUser;

  constructor(
    private apiService: ApiService,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router) {

    this.apiService.getProfile().subscribe(user => {
      this.user = user;
      this.createForm();
    });
  }

  ngOnInit(): void {
  }

  private createForm() {

    this.formModifyUser = this.formBuilder.group({
      username: new FormControl({value: this.user.username, disabled: true}, Validators.required),
      firstName: new FormControl(this.user.first_name, Validators.required),
      lastName: new FormControl(this.user.last_name, Validators.required),
      email: new FormControl(this.user.email, Validators.compose(
        [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')])),
      phone: new FormControl(this.user.phone, Validators.pattern(PHONE_REGEX)),
      street: new FormControl(this.user.street, Validators.required),
      street2: new FormControl(this.user.street2),
      postcode: new FormControl(this.user.postcode, Validators.required),
      city: new FormControl(this.user.city, Validators.required),
      country: new FormControl(this.user.country, Validators.required),
      companyName: new FormControl(this.user.company_name, Validators.required),
    });
  }

  onModifyUserSubmit(): void {

    if (this.formModifyUser.pristine) {
      this.snackBar.open('Vous n\'avez rien modifié !', 'Ok', {panelClass: 'notification-error'});
      return;
    }

    if (this.formModifyUser.valid) {
      const user: IUserToPost = {
        username: this.formModifyUser.get('username')?.value,
        first_name: this.formModifyUser.get('firstName')?.value,
        last_name: this.formModifyUser.get('lastName')?.value,
        email: this.formModifyUser.get('email')?.value,
        street: this.formModifyUser.get('street')?.value,
        street2: this.formModifyUser.get('street2')?.value,
        postcode: this.formModifyUser.get('postcode')?.value,
        city: this.formModifyUser.get('city')?.value,
        country: this.formModifyUser.get('country')?.value,
        company_name: this.formModifyUser.get('companyName')?.value,
        phone: this.formModifyUser.get('phone')?.value,
      };

      this.apiService.change(user)
        .pipe(
          catchError(errorXhr => {
            let message = '';
            for (const attr in errorXhr.error) {
              if (Array.isArray(errorXhr.error[attr])) {
                message += errorXhr.error[attr].join('\n');
              } else {
                message += errorXhr.error[attr];
              }
            }
            this.snackBar.open(message, 'Ok', {panelClass: 'notification-error'});
            return of(false);
          })
        )
        .subscribe(async (res) => {
          if (res) {

            this.snackBar.open('Vos modifications ont été soumises aux gestionnaires du Geoshop et un email de confirmation vous a été envoyé. Vos modifications seront validées par leur soin d\'ici quelques jours.', 'Ok', {panelClass: 'notification-info'});
            await this.router.navigate(['/account/profile']);
          } else {
            this.formModifyUser.markAsDirty();
          }
        });
    }
  }
}
