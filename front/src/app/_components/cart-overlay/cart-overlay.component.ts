import {Component, OnInit} from '@angular/core';
import {IOrder} from '../../_models/IOrder';

@Component({
  selector: 'gs2-cart-overlay',
  templateUrl: './cart-overlay.component.html',
  styleUrls: ['./cart-overlay.component.scss']
})
export class CartOverlayComponent implements OnInit {

  order: IOrder;

  constructor() {
    this.order = {
      id: 'temp',
      processing_fee: 10,
      orderItems: [
        {
          id: '1', product: {
            url: '', label: 'test', group: '',
            order: 1,
            status: 'PENDING'
          }
        },
        {
          id: '2', product: {
            url: '', label: 'test 2', group: '',
            order: 1,
            status: 'PENDING'
          }
        }
      ],
      total_cost: 100,
      vat: 7.7
    };
  }

  ngOnInit(): void {
  }

}
