import { TestBed } from '@angular/core/testing';

import { ApiOrderService } from './api-order.service';

describe('ApiOrderService', () => {
  let service: ApiOrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiOrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
