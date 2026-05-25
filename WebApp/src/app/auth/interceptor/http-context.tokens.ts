import { HttpContextToken } from '@angular/common/http';
import { RequestContext } from '@app-types/request-context';

export const CUSTOM_REQUEST_CONTEXT = new HttpContextToken<RequestContext>(
  () => ({
    skipAlert: false,
    showLoader: false
  })
);