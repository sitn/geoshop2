import {Component, OnInit} from '@angular/core';
import {ApiService} from '../../_services/api.service';

@Component({
  selector: 'gs2-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  constructor(private apiService: ApiService) {
  }

  ngOnInit(): void {
    this.apiService.getProfile().subscribe(x => console.log(x));
  }

}
