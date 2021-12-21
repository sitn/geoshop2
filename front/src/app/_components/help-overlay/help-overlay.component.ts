import {Component, HostBinding, OnInit} from '@angular/core';
import {ConfigService} from '../../_services/config.service';

@Component({
  selector: 'gs2-help-overlay',
  templateUrl: './help-overlay.component.html',
  styleUrls: ['./help-overlay.component.scss']
})
export class HelpOverlayComponent implements OnInit {

  @HostBinding('class') class = 'overlay-container';

  phoneLabel: string;
  phoneNumber: string;
  email: string;

  constructor(configService: ConfigService) {
    this.phoneLabel = configService.config?.contact.phone.label || '';
    this.phoneNumber = configService.config?.contact.phone.number || '';
    this.email = configService.config?.contact.email || '';
  }

  ngOnInit(): void {
  }

}
