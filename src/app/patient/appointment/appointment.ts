import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, SharedHeader, FormsModule],
  templateUrl: './appointment.html',
  styleUrl: './appointment.css',
})
export class Appointment implements OnInit{
 userName: string = '';
  activeTab: 'upcoming' | 'past' = 'upcoming';
  
  appointments: Appointmentattributes[] = [];
  filteredAppointments: Appointmentattributes[] = [];
  selectedAppointment: Appointmentattributes | null = null;
  
  showCancelModal: boolean = false;
  showMessageModal: boolean = false;
  
  messageText: string = '';
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

  loadUserInfo(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userName = `${user.firstName} ${user.lastName}`;
    }
  }

  // FIX 1: Load appointments and connections together
  loadAppointmentsAndConnections(): void {
    this.isLoading = true;
    
    // Use forkJoin to wait for both requests to complete
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
              // Extract doctor ID - handle both populated and non-populated cases
              const doctorId = typeof conn.doctor === 'string' 
                ? conn.doctor 
                : conn.doctor._id || conn.doctor.id;
              
              connectionMap.set(doctorId, conn._id);
              console.log(`📍 Mapped doctor ${doctorId} to connection ${conn._id}`);
            }
          });
        }

        // Transform appointments with connection IDs
        if (appointments.success && appointments.appointments) {
          this.appointments = appointments.appointments.map(apt => {
            // Extract doctor ID from appointment
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
              connectionId: connectionId // Already assigned here
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
    this.showMessageModal = true;
  }

  closeMessageModal(): void {
    this.showMessageModal = false;
    this.selectedAppointment = null;
    this.messageText = '';
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.selectedAppointment || !this.selectedAppointment.connectionId) {
      console.warn('⚠️ Cannot send message: missing text or connection');
      return;
    }

    console.log('📤 Sending message to connectionId:', this.selectedAppointment.connectionId);

    this.messageService.sendMessage(
      this.selectedAppointment.connectionId,
      this.messageText.trim()
    ).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Message sent successfully');
          alert('Message sent successfully!');
          this.closeMessageModal();
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

  joinVideoCall(appointment: Appointmentattributes): void {
    console.log('📹 Joining video call:', appointment.id);
    alert('Video call feature coming soon!');
  }

  logout(): void {
    this.router.navigate(['login']);
  }
}
