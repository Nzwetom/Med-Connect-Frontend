import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MessageService } from '../../services/message';
import { ConnectionService } from '../../services/connection';
import { AppointmentService, Appointment as AppointmentModel } from '../../services/appointment.service';


interface Appointmentattributes {
  id: string;
  doctorId?: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'rejected';
  type: 'in-person' | 'video';
  imageUrl: string;
  connectionId?: string;
  reason?: string;
  rawDate?: Date;
}

interface DisplayMessage {
  text: string;
  time: string;
  isFromCurrentUser: boolean;
  hasAttachment?: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
}

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, SharedHeader, FormsModule],
  templateUrl: './appointment.html',
  styleUrl: './appointment.css',
})
export class Appointment implements OnInit{
 @ViewChild('messagesArea') messagesArea!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  userName: string = '';
  currentUserId: string = '';
  activeTab: 'upcoming' | 'past' = 'upcoming';
  
  appointments: Appointmentattributes[] = [];
  filteredAppointments: Appointmentattributes[] = [];
  selectedAppointment: Appointmentattributes | null = null;
  
  showCancelModal: boolean = false;
  showMessageModal: boolean = false;
  
  // Message modal properties
  messageText: string = '';
  messages: DisplayMessage[] = [];
  attachedFile: File | null = null;
  loadingMessages: boolean = false;
  private shouldScrollToBottom: boolean = false;
  private messagePollingInterval: any;
  
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private connectionService: ConnectionService,
    private appointmentService: AppointmentService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadAppointmentsAndConnections();
  }

  ngOnDestroy(): void {
    if (this.messagePollingInterval) {
      clearInterval(this.messagePollingInterval);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadUserInfo(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.currentUserId = user.id || user._id;
      this.userName = `${user.firstName} ${user.lastName}`;
      console.log('👤 Patient loaded:', this.userName, 'ID:', this.currentUserId);
    }
  }

  loadAppointmentsAndConnections(): void {
    this.isLoading = true;
    
    forkJoin({
      appointments: this.appointmentService.getPatientAppointments(),
      connections: this.connectionService.getPatientConnections()
    }).subscribe({
      next: ({ appointments, connections }) => {
        console.log('📦 Loaded appointments:', appointments);
        console.log('🔗 Loaded connections:', connections);

        // Build connection map first
        const connectionMap = new Map<string, string>();
        if (connections.success && connections.connections) {
          connections.connections.forEach(conn => {
            if (conn.status === 'accepted') {
              const doctorId = typeof conn.doctor === 'string' 
                ? conn.doctor 
                : conn.doctor._id || conn.doctor.id;
              
              connectionMap.set(doctorId, conn._id);
              console.log(`🔑 Mapped doctor ${doctorId} to connection ${conn._id}`);
            }
          });
        }

        // Transform appointments with connection IDs
        if (appointments.success && appointments.appointments) {
          this.appointments = appointments.appointments.map(apt => {
            const doctorId = typeof apt.doctor === 'string'
              ? apt.doctor
              : apt.doctor._id || apt.doctor.id;
            
            const doctorFirstName = typeof apt.doctor === 'string' 
              ? 'Doctor' 
              : apt.doctor.firstName || 'Doctor';
            const doctorLastName = typeof apt.doctor === 'string'
              ? ''
              : apt.doctor.lastName || '';
            const specialty = typeof apt.doctor === 'string'
              ? 'General Practice'
              : apt.doctor.specialty || 'General Practice';

            const connectionId = connectionMap.get(doctorId);
            
            console.log(`🔍 Appointment for doctor ${doctorId}: connectionId = ${connectionId}`);

            return {
              id: apt._id,
              doctorId: doctorId,
              doctorName: `Dr. ${doctorFirstName} ${doctorLastName}`.trim(),
              specialty: specialty,
              date: this.formatDate(apt.date),
              time: apt.startTime,
              location: apt.location || 'Video Call',
              status: apt.status,
              type: apt.type,
              imageUrl: '',
              reason: apt.reason,
              rawDate: new Date(apt.date),
              connectionId: connectionId
            };
          });

          console.log('✅ Final appointments with connections:', this.appointments);
        }

        this.filterAppointments();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading data:', error);
        this.isLoading = false;
        this.filterAppointments();
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  }

  switchTab(tab: 'upcoming' | 'past'): void {
    this.activeTab = tab;
    this.filterAppointments();
  }

  filterAppointments(): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    console.log('🔍 Filtering appointments. Current date:', now);
    console.log('📊 Total appointments:', this.appointments.length);
    
    if (this.activeTab === 'upcoming') {
      this.filteredAppointments = this.appointments.filter(apt => {
        if (!apt.rawDate) {
          console.warn('⚠️ Appointment missing rawDate:', apt);
          return false;
        }
        
        const aptDate = new Date(apt.rawDate);
        aptDate.setHours(0, 0, 0, 0);
        
        const isUpcoming = aptDate >= now && 
          apt.status !== 'cancelled' && 
          apt.status !== 'completed' &&
          apt.status !== 'rejected';
          
        console.log(`${apt.doctorName} on ${apt.date}: upcoming=${isUpcoming}, status=${apt.status}, connectionId=${apt.connectionId}`);
        return isUpcoming;
      });
    } else {
      this.filteredAppointments = this.appointments.filter(apt => {
        if (!apt.rawDate) {
          console.warn('⚠️ Appointment missing rawDate:', apt);
          return false;
        }
        
        const aptDate = new Date(apt.rawDate);
        aptDate.setHours(0, 0, 0, 0);
        
        const isPast = aptDate < now || 
          apt.status === 'completed' || 
          apt.status === 'cancelled' ||
          apt.status === 'rejected';
          
        console.log(`${apt.doctorName} on ${apt.date}: past=${isPast}, status=${apt.status}`);
        return isPast;
      });
    }
    
    console.log(`✅ Filtered ${this.filteredAppointments.length} ${this.activeTab} appointments`);
  }

  openCancelModal(appointment: Appointmentattributes): void {
    this.selectedAppointment = appointment;
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.selectedAppointment = null;
  }

  confirmCancel(): void {
    if (!this.selectedAppointment) return;

    const reason = prompt('Please provide a reason for cancellation (optional):') || '';

    this.appointmentService.cancelAppointment(this.selectedAppointment.id, reason).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Appointment cancelled successfully');
          this.loadAppointmentsAndConnections();
          this.closeCancelModal();
        }
      },
      error: (error) => {
        console.error('❌ Error cancelling appointment:', error);
        alert('Failed to cancel appointment. Please try again.');
      }
    });
  }

  // ============================================
  // UPDATED MESSAGE MODAL FUNCTIONS
  // ============================================

  openMessageModal(appointment: Appointmentattributes): void {
    console.log('💬 Opening message modal for:', appointment);
    console.log('🔑 Connection ID:', appointment.connectionId);
    
    if (!appointment.connectionId) {
      alert('Connection not found. Unable to send message to this doctor.');
      console.error('❌ No connectionId for appointment:', appointment);
      return;
    }

    this.selectedAppointment = appointment;
    this.messageText = '';
    this.messages = [];
    this.attachedFile = null;
    this.showMessageModal = true;

    // Load existing messages
    this.loadMessages();

    // Start polling for new messages
    this.startMessagePolling();
  }

  closeMessageModal(): void {
    this.showMessageModal = false;
    this.selectedAppointment = null;
    this.messageText = '';
    this.messages = [];
    this.attachedFile = null;

    // Stop polling
    if (this.messagePollingInterval) {
      clearInterval(this.messagePollingInterval);
      this.messagePollingInterval = null;
    }
  }

  loadMessages(): void {
    if (!this.selectedAppointment?.connectionId) return;

    this.loadingMessages = true;

    this.messageService.getMessages(this.selectedAppointment.connectionId).subscribe({
      next: (response) => {
        if (response.success && response.messages) {
          const previousCount = this.messages.length;

          this.messages = response.messages.map(msg => ({
            text: msg.content,
            time: this.formatTime(msg.createdAt),
            isFromCurrentUser: msg.sender === this.currentUserId,
            hasAttachment: msg.hasAttachment,
            attachmentName: msg.attachmentName,
            attachmentUrl: msg.attachmentUrl
          }));

          // Scroll if new messages arrived
          if (this.messages.length > previousCount) {
            this.shouldScrollToBottom = true;
          }

          console.log('✅ Messages loaded:', this.messages.length);
        }
        this.loadingMessages = false;
      },
      error: (error) => {
        console.error('❌ Error loading messages:', error);
        this.loadingMessages = false;
      }
    });
  }

  startMessagePolling(): void {
    // Clear any existing interval
    if (this.messagePollingInterval) {
      clearInterval(this.messagePollingInterval);
    }

    // Poll every 3 seconds
    this.messagePollingInterval = setInterval(() => {
      if (this.selectedAppointment?.connectionId) {
        this.loadMessages();
      }
    }, 3000);
  }

  sendMessage(): void {
    if ((!this.messageText.trim() && !this.attachedFile) || !this.selectedAppointment?.connectionId) {
      console.warn('⚠️ Cannot send message: missing text or connection');
      return;
    }

    const content = this.messageText.trim() || (this.attachedFile ? `Sent ${this.attachedFile.name}` : '');

    console.log('📤 Sending message to connectionId:', this.selectedAppointment.connectionId);

    this.messageService.sendMessage(
      this.selectedAppointment.connectionId,
      content,
      this.attachedFile || undefined
    ).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Message sent successfully');

          // Add message optimistically to UI
          this.messages.push({
            text: content,
            time: this.formatTime(new Date().toISOString()),
            isFromCurrentUser: true,
            hasAttachment: !!this.attachedFile,
            attachmentName: this.attachedFile?.name
          });

          // Clear inputs
          this.messageText = '';
          this.attachedFile = null;
          if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
          }

          this.shouldScrollToBottom = true;
        }
      },
      error: (error) => {
        console.error('❌ Error sending message:', error);
        console.error('Error details:', {
          status: error.status,
          message: error.error?.message || error.message,
          error: error.error
        });
        alert(`Failed to send message: ${error.error?.message || 'Please try again.'}`);
      }
    });
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('File size exceeds 10MB limit.');
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Please upload PDF, JPG, PNG, DOC, or DOCX files.');
        return;
      }

      this.attachedFile = file;
      console.log('📎 File attached:', file.name);
    }
  }

  removeAttachment(): void {
    this.attachedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesArea) {
        const element = this.messagesArea.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('❌ Error scrolling:', err);
    }
  }

  joinVideoCall(appointment: Appointmentattributes): void {
    console.log('🎥 Joining video call:', appointment.id);
    alert('Video call feature coming soon!');
  }

  logout(): void {
    this.router.navigate(['login']);
  }
}
