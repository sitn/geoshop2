import {Component, HostBinding, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {EMAIL_REGEX} from '../../_helpers/regex';
import {ApiService} from '../../_services/api.service';
import {catchError} from 'rxjs/operators';
import {of} from 'rxjs';

@Component({
  selector: 'gs2-forget',
  templateUrl: './forget.component.html',
  styleUrls: ['./forget.component.scss']
})
export class ForgetComponent implements OnInit {

  @HostBinding('class') class = 'main-container';

  private readonly successMessage = 'Le mot de passe a été envoyé à l\'adresse : ';
  form: FormGroup;

  get email() {
    return this.form.get('email');
  }

  constructor(private fb: FormBuilder,
              private router: Router,
              public snackBar: MatSnackBar,
              private apiService: ApiService
  ) {
    this.form = this.fb.group({
      email: ['', Validators.compose([Validators.required, Validators.pattern(EMAIL_REGEX)])],
    });
  }

  ngOnInit(): void {
  }

  onSubmit(event: MouseEvent) {
    event.preventDefault();

    if (!this.form.valid) {
      return;
    }

    this.apiService.forget(this.form.value.email)
      .subscribe((result) => {
        if (!result) {
          return;
        } else {
          this.snackBar.open(`${this.successMessage} ${this.form.value.email}`,
            'Ok', {panelClass: 'notification-success'});
          this.router.navigate(['']);
        }
      });
  }
}
