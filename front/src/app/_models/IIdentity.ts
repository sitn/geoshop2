export interface ICredentials {
  username: string;
  password: string;
}

export interface IIdentity {
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  username?: string;
  url?: string;
  password1?: string;
  password2?: string;
  last_login?: Date;
  is_superuser?: boolean;
  is_staff?: boolean;
  is_active?: boolean;
  date_joined?: Date;
  street?: string;
  street2?: string;
  postcode?: string;
  city?: string;
  country?: string;
  phone?: string;
  sap_id?: number;
  contract_accepted?: boolean;
  token?: string;
  tokenRefresh?: string;
}
