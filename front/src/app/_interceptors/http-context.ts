import { HttpContextToken } from '@angular/common/http';

/**
 * Set to `true` on a request's HttpContext to prevent the TokenInterceptor
 * from attaching the Authorization header (e.g. requests to third-party
 * services that should not receive our auth token).
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
