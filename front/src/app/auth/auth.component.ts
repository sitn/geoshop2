import {Component, HostBinding, OnInit} from '@angular/core';

@Component({
  selector: 'gs2-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {

  @HostBinding('class') class = 'main-container';

  constructor() {
  }

  ngOnInit(): void {
  }

}
