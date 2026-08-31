import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();
  const role = user?.role || 'ROLE_STAFF';

  if (role === 'ROLE_STAFF') {
    return router.createUrlTree(['/dashboard/requests']);
  } else {
    return router.createUrlTree(['/dashboard/equipment']);
  }
};
