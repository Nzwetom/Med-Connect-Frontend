import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FindDoctors } from './find-doctors';

describe('FindDoctors', () => {
  let component: FindDoctors;
  let fixture: ComponentFixture<FindDoctors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FindDoctors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FindDoctors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
