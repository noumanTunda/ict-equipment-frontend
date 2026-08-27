import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import {ResetPasswordComponent} from "./auth/reset-password/reset-password.component";
import {ForgotPasswordComponent} from "./auth/forgot-password/forgot-password.component";
import {DashboardComponent} from "./dashboard/dashboard.component";
import {AuthGuard} from "./guards/AuthGuard";

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Sign In | ICT Equipment Portal',
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Create Account | ICT Equipment Portal',
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    title: 'Reset Password | ICT Equipment Portal',
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    title: 'Forgot Password | ICT Equipment Portal',
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard.canActivate] // Route guarded
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
