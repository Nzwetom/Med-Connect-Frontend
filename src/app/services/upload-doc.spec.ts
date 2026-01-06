import { TestBed } from '@angular/core/testing';

import { UploadDoc } from './upload-doc';

describe('UploadDoc', () => {
  let service: UploadDoc;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadDoc);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
