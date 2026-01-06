import { TestBed } from '@angular/core/testing';

import { DoctorProfile } from './doctor-profile';

describe('DoctorProfile', () => {
  let service: DoctorProfile;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DoctorProfile);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
