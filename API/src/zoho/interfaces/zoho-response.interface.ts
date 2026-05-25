export interface ZohoCreateResponse {
  data: Array<{
    code: string;
    details: {
      id: string;
      Modified_Time?: string;
      Modified_By?: {
        name: string;
        id: string;
      };
      Created_Time?: string;
      Created_By?: {
        name: string;
        id: string;
      };
    };
    message: string;
    status: string;
  }>;
}

export interface ZohoApiError {
  error: string;
  error_description?: string;
}

export interface ZohoModulesResponse {
  modules: Array<{
    id: string;
    module_name: string;
    api_name: string;
  }>;
}
