import {Component, Input, OnInit} from '@angular/core';
import {Order} from '../../_models/IOrder';

@Component({
  selector: 'gs2-order-view',
  templateUrl: './order-view.component.html',
  styleUrls: ['./order-view.component.scss']
})
export class OrderViewComponent implements OnInit {

  @Input() order: Order;

  constructor() {

  }

  ngOnInit(): void {
  }

}
