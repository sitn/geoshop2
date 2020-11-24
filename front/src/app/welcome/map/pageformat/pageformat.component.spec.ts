import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PageformatComponent } from './pageformat.component';

describe('PageformatComponent', () => {
  let component: PageformatComponent;
  let fixture: ComponentFixture<PageformatComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PageformatComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PageformatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
