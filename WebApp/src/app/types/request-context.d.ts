export interface RequestContext {
  skipAlert?: boolean;
  showLoader?: boolean;
  customSuccessAlert?: CustomMessage;
  customErrorAlert?: CustomMessage;
  customInfoAlert?: CustomMessage;
}

interface CustomMessage {
  title?: string;
  message?: string;
}