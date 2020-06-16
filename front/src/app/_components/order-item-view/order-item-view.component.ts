import {Component, Input, OnInit} from '@angular/core';
import {IOrderItem} from '../../_models/IOrder';

@Component({
  selector: 'gs2-order-item-view',
  templateUrl: './order-item-view.component.html',
  styleUrls: ['./order-item-view.component.scss']
})
export class OrderItemViewComponent implements OnInit {

  displayedColumns: string[] = ['product', 'format', 'lastDownload'];
  @Input() dataSource: IOrderItem[];

  constructor() {
  }

  ngOnInit(): void {
  }

}
