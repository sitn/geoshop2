import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AccountOverlayComponent } from './account-overlay.component';

describe('AccountOverlayComponent', () => {
  let component: AccountOverlayComponent;
  let fixture: ComponentFixture<AccountOverlayComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AccountOverlayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
