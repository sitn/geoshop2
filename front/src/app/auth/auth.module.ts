import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthRoutingModule } from './auth-routing.module';
import { AuthComponent } from './auth.component';
import { LoginComponent } from './login/login.component';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {ReactiveFormsModule} from '@angular/forms';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import { RegisterComponent } from './register/register.component';
import { ForgetComponent } from './forget/forget.component';
import {MatIconModule} from '@angular/material/icon';
import { ResetComponent } from './reset/reset.component';
import {MatStepperModule} from '@angular/material/stepper';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';

const MODULES = [
  MatCardModule,
  MatInputModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatButtonModule,
  MatIconModule,
  MatStepperModule,
  MatSelectModule
];

@NgModule({
  declarations: [AuthComponent, LoginComponent, RegisterComponent, ForgetComponent, ResetComponent],
  imports: [
    CommonModule,
    AuthRoutingModule,
    ReactiveFormsModule,
    MODULES,
  ]
})
export class AuthModule { }
