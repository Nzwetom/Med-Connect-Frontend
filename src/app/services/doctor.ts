import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  specialty?: string;
  hospital?: string;
  rating: number;
  reviewCount: number;
  availableToday: boolean;
  isVerified: boolean;
}

export interface DoctorResponse {
  success: boolean;
  message?: string;
  doctor?: Doctor;
  doctors?: Doctor[];
}

@Injectable({
  providedIn: 'root',
})
export class DoctorService {

  private apiUrl = 'http://localhost:5000/api/doctors';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get all doctors with optional filters
  getAllDoctors(specialty?: string, search?: string): Observable<DoctorResponse> {
    let url = this.apiUrl;
    const params: string[] = [];

    if (specialty && specialty !== 'all') {
      params.push(`specialty=${specialty}`);
    }

    if (search && search.trim()) {
      params.push(`search=${encodeURIComponent(search.trim())}`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http.get<DoctorResponse>(url, { headers: this.getHeaders() });
  }

  // Get single doctor by ID
  getDoctorById(id: string): Observable<DoctorResponse> {
    return this.http.get<DoctorResponse>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }
  
}
