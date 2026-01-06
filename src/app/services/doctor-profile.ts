import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DoctorProfileData {
  specialty?: string;
  phone?: string;
  hospital?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
  availability?: any;
}

export interface Doctor {
  _id: string;
  userId: string;
  specialty: string;
  phone: string;
  hospital?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetProfileResponse {
  success: boolean;
  message?: string;
  doctor?: Doctor;
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  user?: any;
  doctor?: Doctor;
}


@Injectable({
  providedIn: 'root',
})
export class DoctorProfile {
  
  private apiUrl = 'http://localhost:5000/api/doctors';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Get the current doctor's profile
   */
  getProfile(): Observable<GetProfileResponse> {
    return this.http.get<GetProfileResponse>(
      `${this.apiUrl}/profile`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Update doctor profile information
   */
  updateProfile(profileData: DoctorProfileData): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(
      `${this.apiUrl}/profile`,
      profileData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Mark doctor onboarding as complete and set isVerified to true
   */
  completeOnboarding(): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(
      `${this.apiUrl}/complete-onboarding`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Check if doctor profile is complete
   * Returns true if all required fields are filled
   */
  isProfileComplete(doctor: Doctor): boolean {
    return !!(
      doctor.specialty &&
      doctor.phone &&
      doctor.isVerified
    );
  }

  /**
   * Get profile completion percentage
   */
  getProfileCompletionPercentage(doctor: Doctor): number {
    const fields = [
      doctor.specialty,
      doctor.phone,
      doctor.hospital,
      doctor.yearsOfExperience !== undefined && doctor.yearsOfExperience > 0,
      doctor.consultationFee !== undefined && doctor.consultationFee > 0,
      doctor.bio,
      doctor.isVerified
    ];

    const filledFields = fields.filter(field => !!field).length;
    return Math.round((filledFields / fields.length) * 100);
  }

}
