import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';


export interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
  };

  type:
    | 'CONNECTION_REQUEST'
    | 'CONNECTION_ACCEPTED'
    | 'CONNECTION_REJECTED'
    | 'APPOINTMENT_REQUEST'
    | 'APPOINTMENT_CONFIRMED'
    | 'APPOINTMENT_REJECTED'
    | 'APPOINTMENT_CANCELLED';

  message: string;
  isRead: boolean;

  relatedConnection?: {
    _id: string;
    status: 'pending' | 'accepted' | 'rejected';
  };

  relatedAppointment?: {
    _id: string;
    status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
    date?: string;
  };

  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  success: boolean;
  message?: string;
  notifications?: Notification[];
  notification?: Notification;
  unreadCount?: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  private apiUrl = 'http://localhost:5000/api/notifications';
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    // Poll for notifications every 30 seconds
    this.startPolling();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Start polling for unread count
  private startPolling(): void {
    interval(30000) // 30 seconds
      .pipe(
        switchMap(() => this.getUnreadCount())
      )
      .subscribe();
  }

  // Get all notifications
  getNotifications(): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  // Get unread notification count
  getUnreadCount(): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(
      `${this.apiUrl}/unread-count`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        if (response.success && response.unreadCount !== undefined) {
          this.unreadCountSubject.next(response.unreadCount);
        }
      })
    );
  }

  // Mark notification as read
  markAsRead(notificationId: string): Observable<NotificationResponse> {
    return this.http.patch<NotificationResponse>(
      `${this.apiUrl}/${notificationId}/read`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        // Decrease unread count
        const currentCount = this.unreadCountSubject.value;
        if (currentCount > 0) {
          this.unreadCountSubject.next(currentCount - 1);
        }
      })
    );
  }

  // Refresh unread count manually
  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }
  
}
