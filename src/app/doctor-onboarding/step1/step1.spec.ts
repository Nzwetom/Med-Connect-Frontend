import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Step1 } from './step1';

describe('Step1', () => {
  let component: Step1;
  let fixture: ComponentFixture<Step1>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step1]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Step1);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
