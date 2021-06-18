export const EMAIL_REGEX = new RegExp(/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/);
export const PHONE_REGEX =
  new RegExp(/(^[\\+]{1}[0-9]{11}$)|(^[\\+]{1}[0-9 ]{15}$)|(^[0]{2}[0-9]{11}$)|(^[0]{2}[0-9 ]{15}$)|(^[0]{1}[0-9]{9}$)|(^[0]{1}[0-9 ]{13}$)/);
export const IDE_REGEX =
  new RegExp(/^CHE-([0-9]{3}\.){2}[0-9]{3}$/);
export const EXTRACT_FORBIDDEN_REGEX = new RegExp(/^[^<>%$"\(\)\n\r]*$/);
