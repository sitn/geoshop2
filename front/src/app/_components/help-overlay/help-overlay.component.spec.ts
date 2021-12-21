import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HelpOverlayComponent } from './help-overlay.component';

describe('HelpOverlayComponent', () => {
  let component: HelpOverlayComponent;
  let fixture: ComponentFixture<HelpOverlayComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HelpOverlayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HelpOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
