import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Step4 } from './step4';

describe('Step4', () => {
  let component: Step4;
  let fixture: ComponentFixture<Step4>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step4]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Step4);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
