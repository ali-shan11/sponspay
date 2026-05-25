export interface AlertMessage {
  id: string;
  message: string;
  title: string;
  type: AlertMessageType;
  links?: AlertLinks[];
}

export type AlertMessageType = 'success' | 'error' | 'info';

export interface AlertLinks {
  link: string;
  linkText: string;
}

export interface ApiError {
  message: string;
  error: string;
  statusCode: string;
}