export interface IUserChangeResponse {
  detail: string;
}

export interface IUserToPost {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  street: string;
  street2: string;
  postcode: string;
  city: string;
  country: string;
  company_name: string;
  ide_id?: number;
  phone: string;
}

export interface IUser {
  id: number;
  last_login: string;
  username: string;
  date_joined: string;
  identity_id: number;
  first_name: string;
  last_name: string;
  email: string;
  street: string;
  street2: string;
  postcode: string;
  city: string;
  country: string;
  company_name: string;
  ide_id?: number;
  phone: string;
}
