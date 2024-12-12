import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConstantsService {

  constructor() { }

  static readonly REQUIRED: string = `:@@required:Required`;
  static readonly DOWNLOAD: string = `:@@download:Download`;
  static readonly LOGIN: string = `:@@login:Login`;
  static readonly NEXT: string = `:@@logout:Suivant`;
  static readonly PREVIOUS: string = `:@@previous:Retour`;
  static readonly WRONG_EMAIL: string = `:@@wrong_email:Format de courriel incorrect`;
  static readonly WRONG_PHONE: string = `:@@wrong_phone:Mauvais format de téléphone, accepté :`;
  // FIXME currently this needs to be configured in the DB with the exact same string in the table geoshop.order_type
  static readonly ORDERTYPE_PRIVATE: string = 'private';
  // static readonly ORDERTYPE_PUBLIC: string = 'public'; // This is the second typ but does not seem to be used
  // Orders
  static ORDER_STATUS = {
    DRAFT:  `:@@order.draft:Brouillon`,
    PENDING:  `:@@order.pending:En attente du devis`,
    QUOTE_DONE:  `:@@order.quote_done:Devis réalisé, en attente de confirmation`,
    READY:  `:@@order.ready:Extraction en cours`,
    IN_EXTRACT: `:@@order.in_extract:Extraction en cours`,
    PARTIALLY_DELIVERED:  `:@@order.part_delivered:Partiellement traitée`,
    PROCESSED:  `:@@order.processed:Traitée`,
    ARCHIVED:  `:@@order.archived:Archivée`,
    REJECTED:  `:@@order.rejected:Annulée`,
    // CONFIRM_REQUEST:  `:@@order.rejected:Rejected`, // TODO: looks not used
    UNKNOWN:  `:@@order.unkown:Etat inconnu`
  };

  static ORDER_NAME = {
    PUBLIC:  `:@@order.public:Public`,
    PRIVATE:  `:@@order.private:Privé`
  }

  static COUNTRIES = {
    CH: {
      name: `@@country.ch.name:Suisse`
    },
    FR: {
      name: `@@country.fr.name:France`
    }
  };
}
