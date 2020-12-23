export interface IContactPerson {
  city: string;
  company_name: string;
  country: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  postcode: string;
  street: string;
  street2: string;
}

export interface IMetadataRole {
  contact_person: IContactPerson;
  metadata_role: string;
}

export interface IMetadata {
  url: string;
  contact_persons: Array<IMetadataRole>;
  modified_user: string;
  id_name: string;
  name: string;
  description_short: string;
  description_long: string;
  scale: string;
  geocat_link: string;
  legend_link?: string;
  image_link: string;
  modified_date: string;
  copyright: string;
  documents: Array<any>;
}
