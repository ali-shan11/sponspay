export interface ZohoLead {
  First_Name: string;
  Last_Name: string;
  Email: string;
  Phone?: string;
  Company: string;
  Lead_Source: string;
  Description?: string;
  Country?: string;
  Lead_Status: string;
}

export interface CreateLeadRequest {
  data: ZohoLead[];
}

export interface CreateLeadResponse {
  data: Array<{
    code: string;
    details: {
      Modified_Time: string;
      Modified_By: {
        name: string;
        id: string;
      };
      Created_Time: string;
      id: string;
      Created_By: {
        name: string;
        id: string;
      };
    };
    message: string;
    status: string;
  }>;
}
