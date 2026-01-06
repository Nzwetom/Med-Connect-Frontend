import { TestBed } from '@angular/core/testing';

import { PatientProfile } from './patient-profile';

describe('PatientProfile', () => {
  let service: PatientProfile;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PatientProfile);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
