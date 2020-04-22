import {Component, HostBinding, OnInit} from '@angular/core';
import {ApiService} from '../../_services/api.service';

@Component({
  selector: 'gs2-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  @HostBinding('class') class = 'main-container dark-background';

  user$ = this.apiService.getProfile();

  constructor(private apiService: ApiService) {
  }

  ngOnInit(): void {
  }

}
