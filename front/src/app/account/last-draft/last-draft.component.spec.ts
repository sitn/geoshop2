import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LastDraftComponent } from './last-draft.component';

describe('LastDraftComponent', () => {
  let component: LastDraftComponent;
  let fixture: ComponentFixture<LastDraftComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LastDraftComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LastDraftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
