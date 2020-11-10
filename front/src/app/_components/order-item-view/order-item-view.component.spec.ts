import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderItemViewComponent } from './order-item-view.component';

describe('OrderItemViewComponent', () => {
  let component: OrderItemViewComponent;
  let fixture: ComponentFixture<OrderItemViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OrderItemViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrderItemViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
