import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  userType: 'patient' | 'doctor';
  isVerified: boolean;
  token?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class Auth {

   private apiUrl = 'http://localhost:5000/api/auth'; 
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  public get userType(): 'patient' | 'doctor' | null {
    return this.currentUserValue?.userType || null;
  }

  signUp(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    userType: 'patient' | 'doctor';
  }): Observable<AuthResponse> {
  
    const payload = {
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email,
    password: userData.password,
    phone: userData.phone,
    address: userData.address,
    userType: userData.userType
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, payload)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Store user data and token
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
            localStorage.setItem('token', response.data.token);
            this.currentUserSubject.next(response.data.user);
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  signIn(credentials: {
    email: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Store user data and token
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
            localStorage.setItem('token', response.data.token);
            this.currentUserSubject.next(response.data.user);
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  logout(): void {
    // Remove user data from local storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/signin']);
  }

  forgotPassword(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/forgot-password`, { email })
      .pipe(catchError(this.handleError));
  }

  resetPassword(token: string, newPassword: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/reset-password`, {
      token,
      newPassword
    }).pipe(catchError(this.handleError));
  }

  verifyEmail(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-email`, { token })
      .pipe(catchError(this.handleError));
  }

  resendVerificationEmail(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/resend-verification`, { email })
      .pipe(catchError(this.handleError));
  }

  getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  private handleError(error: any) {
    let errorMessage = 'An error occurred. Please try again.';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || errorMessage;
    }
    
    return throwError(() => new Error(errorMessage));
  }
  
}
