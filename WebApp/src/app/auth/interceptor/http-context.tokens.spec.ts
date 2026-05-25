import { HttpContext, HttpContextToken } from '@angular/common/http';
import { CUSTOM_REQUEST_CONTEXT } from './http-context.tokens';
import { RequestContext } from '@app-types/request-context';

describe('CUSTOM_REQUEST_CONTEXT', () => {
  it('should be an instance of HttpContextToken', () => {
    expect(CUSTOM_REQUEST_CONTEXT).toBeDefined();
    expect(CUSTOM_REQUEST_CONTEXT instanceof HttpContextToken).toBe(true);
  });

  it('should have default value with skipAlert false and showLoader false', () => {
    const context = new HttpContext();
    const defaultValue = context.get(CUSTOM_REQUEST_CONTEXT);

    expect(defaultValue.skipAlert).toBe(false);
    expect(defaultValue.showLoader).toBe(false);
  });

  it('should not have customSuccessAlert by default', () => {
    const context = new HttpContext();
    const defaultValue = context.get(CUSTOM_REQUEST_CONTEXT);

    expect(defaultValue.customSuccessAlert).toBeUndefined();
  });

  it('should not have customErrorAlert by default', () => {
    const context = new HttpContext();
    const defaultValue = context.get(CUSTOM_REQUEST_CONTEXT);

    expect(defaultValue.customErrorAlert).toBeUndefined();
  });

  it('should not have customInfoAlert by default', () => {
    const context = new HttpContext();
    const defaultValue = context.get(CUSTOM_REQUEST_CONTEXT);

    expect(defaultValue.customInfoAlert).toBeUndefined();
  });

  it('should allow setting custom values', () => {
    const context = new HttpContext();
    const customContext: RequestContext = {
      skipAlert: true,
      showLoader: true,
      customSuccessAlert: { title: 'Custom Title', message: 'Custom Msg' },
      customErrorAlert: { title: 'Error Title', message: 'Error Msg' },
      customInfoAlert: { title: 'Info Title', message: 'Info Msg' }
    };

    context.set(CUSTOM_REQUEST_CONTEXT, customContext);
    const value = context.get(CUSTOM_REQUEST_CONTEXT);

    expect(value.skipAlert).toBe(true);
    expect(value.showLoader).toBe(true);
    expect(value.customSuccessAlert).toEqual({ title: 'Custom Title', message: 'Custom Msg' });
    expect(value.customErrorAlert).toEqual({ title: 'Error Title', message: 'Error Msg' });
    expect(value.customInfoAlert).toEqual({ title: 'Info Title', message: 'Info Msg' });
  });

  it('should allow partial context values', () => {
    const context = new HttpContext();
    context.set(CUSTOM_REQUEST_CONTEXT, { skipAlert: true });
    const value = context.get(CUSTOM_REQUEST_CONTEXT);

    expect(value.skipAlert).toBe(true);
    expect(value.showLoader).toBeUndefined();
  });

  it('should return independent default value objects for different contexts', () => {
    const context1 = new HttpContext();
    const context2 = new HttpContext();

    const value1 = context1.get(CUSTOM_REQUEST_CONTEXT);
    const value2 = context2.get(CUSTOM_REQUEST_CONTEXT);

    // They should be equal in value but be different object references
    expect(value1).toEqual(value2);
    expect(value1).not.toBe(value2);
  });
});
