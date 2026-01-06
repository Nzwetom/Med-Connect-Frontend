import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Message {
  _id?: string;
  connection: string;
  sender: string;
  receiver: string;
  content: string;
  isRead: boolean;
  hasAttachment?: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  connectionId: string;
  participantId: string;
  participantName: string;
  participantRole: 'doctor' | 'patient';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online: boolean;
}

export interface MessageResponse {
  success: boolean;
  message?: Message;
  messages?: Message[];
  conversations?: Conversation[];
  unreadCount?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {

 private apiUrl = `${environment.apiUrl}/api/messages`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUnreadCount();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // FIX 2: Proper message sending with better error handling
  sendMessage(connectionId: string, content: string, attachment?: File): Observable<MessageResponse> {
    console.log('📤 Sending message:', { connectionId, content, hasAttachment: !!attachment });

    // Validate inputs
    if (!connectionId) {
      console.error('❌ No connectionId provided');
      return throwError(() => new Error('Connection ID is required'));
    }

    if (!content.trim() && !attachment) {
      console.error('❌ No content or attachment provided');
      return throwError(() => new Error('Message content or attachment is required'));
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No auth token found');
      return throwError(() => new Error('Authentication required'));
    }

    if (attachment) {
      // Send with attachment using FormData
      const formData = new FormData();
      formData.append('connectionId', connectionId);
      formData.append('content', content.trim() || `Sent ${attachment.name}`);
      formData.append('attachment', attachment);

      // Don't set Content-Type - browser will set it with boundary
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      return this.http.post<MessageResponse>(
        this.apiUrl,
        formData,
        { headers }
      ).pipe(
        tap(response => {
          console.log('✅ Message with attachment sent:', response);
          this.loadUnreadCount();
        }),
        catchError(error => {
          console.error('❌ Send message with attachment error:', error);
          return throwError(() => error);
        })
      );
    } else {
      // Send text-only message as JSON
      return this.http.post<MessageResponse>(
        this.apiUrl,
        { 
          connectionId, 
          content: content.trim() 
        },
        { headers: this.getHeaders() }
      ).pipe(
        tap(response => {
          console.log('✅ Text message sent:', response);
          this.loadUnreadCount();
        }),
        catchError(error => {
          console.error('❌ Send text message error:', error);
          console.error('Error status:', error.status);
          console.error('Error body:', error.error);
          return throwError(() => error);
        })
      );
    }
  }

  getMessages(connectionId: string): Observable<MessageResponse> {
    console.log('📥 Fetching messages for connection:', connectionId);

    return this.http.get<MessageResponse>(
      `${this.apiUrl}/connection/${connectionId}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Messages retrieved:', response);
      }),
      catchError(error => {
        console.error('❌ Get messages error:', error);
        return throwError(() => error);
      })
    );
  }

  getConversations(): Observable<MessageResponse> {
    console.log('📋 Fetching conversations...');

    return this.http.get<MessageResponse>(
      `${this.apiUrl}/conversations`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Conversations retrieved:', response);
        if (response.conversations) {
          const totalUnread = response.conversations.reduce(
            (sum, conv) => sum + conv.unreadCount, 
            0
          );
          this.unreadCountSubject.next(totalUnread);
        }
      }),
      catchError(error => {
        console.error('❌ Get conversations error:', error);
        return throwError(() => error);
      })
    );
  }

  markAsRead(connectionId: string): Observable<MessageResponse> {
    console.log('✓ Marking messages as read:', connectionId);

    return this.http.patch<MessageResponse>(
      `${this.apiUrl}/connection/${connectionId}/read`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        console.log('✅ Messages marked as read');
        this.loadUnreadCount();
      }),
      catchError(error => {
        console.error('❌ Mark as read error:', error);
        return throwError(() => error);
      })
    );
  }

  getUnreadCount(): Observable<MessageResponse> {
    return this.http.get<MessageResponse>(
      `${this.apiUrl}/unread-count`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        if (response.success && typeof response.unreadCount === 'number') {
          this.unreadCountSubject.next(response.unreadCount);
        }
      }),
      catchError(error => {
        console.error('❌ Get unread count error:', error);
        return throwError(() => error);
      })
    );
  }

  private loadUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  deleteMessage(messageId: string): Observable<MessageResponse> {
    console.log('🗑️ Deleting message:', messageId);

    return this.http.delete<MessageResponse>(
      `${this.apiUrl}/${messageId}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Message deleted:', response)),
      catchError(error => {
        console.error('❌ Delete message error:', error);
        return throwError(() => error);
      })
    );
  }

  
}
