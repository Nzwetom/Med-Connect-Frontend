import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Allergy {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface MedicalCondition {
  condition: string;
  diagnosedDate: string;
  notes: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
}

export interface PatientProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  allergies?: Allergy[];
  emergencyContact?: EmergencyContact;
  medicalHistory?: MedicalCondition[];
  currentMedications?: Medication[];
}

@Injectable({
  providedIn: 'root',
})
export class PatientProfileService {

  private apiUrl = `${environment.apiUrl}/patients`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getMyProfile(): Observable<{ success: boolean; patient: PatientProfile }> {
    return this.http.get<{ success: boolean; patient: PatientProfile }>(
      `${this.apiUrl}/profile`,
      { headers: this.getAuthHeaders() }
    );
  }

  updateProfile(profileData: Partial<PatientProfile>): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/profile`,
      profileData,
      { headers: this.getAuthHeaders() }
    );
  }

  getPatientById(id: string): Observable<{ success: boolean; patient: PatientProfile }> {
    return this.http.get<{ success: boolean; patient: PatientProfile }>(
      `${this.apiUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }
  
}
