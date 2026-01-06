import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DocumentResponse {
  _id: string;
  docTitle: string;
  docDate: string;
  description?: string;
  category: string;
  fileUrl: string;
  patientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse {
  message: string;
  document: DocumentResponse;
}

@Injectable({
  providedIn: 'root',
})
export class UploadDoc {

   private apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  uploadDocument(formData: FormData): Observable<UploadResponse> {

 const headers = this.getAuthHeaders();
    
    // Log for debugging
    console.log('Uploading to:', `${this.apiUrl}/upload`);
    console.log('Token present:', !!localStorage.getItem('token'));
    
    // Don't manually set Content-Type - browser will set it with boundary for FormData
    const headersWithoutContentType = new HttpHeaders({
      'Authorization': headers.get('Authorization') || ''
    });

    return this.http.post<UploadResponse>(
      `${this.apiUrl}/upload`,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  getMyDocuments(): Observable<DocumentResponse[]> {
    return this.http.get<DocumentResponse[]>(
      `${this.apiUrl}/my-documents`,
      { headers: this.getAuthHeaders() }
    );
  }

  getDocumentById(id: string): Observable<DocumentResponse> {
    return this.http.get<DocumentResponse>(
      `${this.apiUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteDocument(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }
  
}
