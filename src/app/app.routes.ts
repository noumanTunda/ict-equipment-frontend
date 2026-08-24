import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Sign In | PPRA ICT Equipment Portal',
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Create Account | PPRA ICT Equipment Portal',
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
