export interface ZohoContactData {
  First_Name: string;
  Last_Name: string;
  Email: string;
  Phone?: string;
  Company: string;
  Lead_Source: string;
  Description?: string;
  Country?: string;
  Department?: string;
}

export interface ContactSearchResponse {
  data: Array<{
    id: string;
    Email: string;
    Description?: string;
    [key: string]: any;
  }>;
}

export interface ContactSearchResult {
  id: string;
  signInCount: number;
}
