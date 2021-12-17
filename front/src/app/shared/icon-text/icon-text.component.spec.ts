import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { IconTextComponent } from './icon-text.component';

describe('IconTextComponent', () => {
  let component: IconTextComponent;
  let fixture: ComponentFixture<IconTextComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ IconTextComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IconTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
