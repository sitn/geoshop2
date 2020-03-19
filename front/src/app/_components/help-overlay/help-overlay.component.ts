import {Component, OnInit} from '@angular/core';
import {ConfigService} from '../../_services/config.service';

@Component({
  selector: 'gs2-help-overlay',
  templateUrl: './help-overlay.component.html',
  styleUrls: ['./help-overlay.component.scss']
})
export class HelpOverlayComponent implements OnInit {

  phoneLabel: string;
  phoneNumber: string;
  email: string;

  constructor(configService: ConfigService) {
    this.phoneLabel = configService.PhoneLabel;
    this.phoneNumber = configService.PhoneNumber;
    this.email = configService.Email;
  }

  ngOnInit(): void {
  }

}
