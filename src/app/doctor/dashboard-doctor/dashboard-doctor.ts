import { Component,OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { OnboardingComponent } from '../../features/onboarding/onboarding'; 
import { OnboardingService } from '../../services/onboarding';
import { forkJoin } from 'rxjs';
import { ConnectionService } from '../../services/connection';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { MessageService } from '../../services/message';

interface StatCard {
  label: string;
  value: number;
  subtitle: string;
  icon: string;
  color: string;
  iconType: string;
}

@Component({
  selector: 'app-dashboard-doctor',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedHeader, OnboardingComponent],
  templateUrl: './dashboard-doctor.html',
  styleUrl: './dashboard-doctor.css',
})
export class DashboardDoctor implements OnInit {
  doctorName: string = '';
  loading: boolean = true;
  
  stats: StatCard[] = [
    { 
      label: 'Total Patients', 
      value: 0, 
      subtitle: 'Loading...', 
      icon: '👥', 
      color: '#4A90E2', 
      iconType: 'patients'
    },
    { 
      label: "Today's Appointments", 
      value: 0, 
      subtitle: 'Loading...', 
      icon: '📅', 
      color: '#5FB3B3', 
      iconType: 'appointments'
    },
    { 
      label: 'Pending Reviews', 
      value: 0, 
      subtitle: 'Loading...', 
      icon: '📋', 
      color: '#FF6B6B', 
      iconType: 'reviews'
    },
    { 
      label: 'Unread Messages', 
      value: 0, 
      subtitle: 'Loading...', 
      icon: '💬', 
      color: '#4A90E2', 
      iconType: 'consults'
    }
  ];

  constructor(
    private router: Router,
    public onboardingService: OnboardingService,
    private connectionService: ConnectionService,
    private appointmentService: AppointmentService,
    private messageService: MessageService
  ) {
    console.log('🟢 DashboardDoctor: Constructor called');
  }

  ngOnInit(): void {
    console.log('🟢 DashboardDoctor: ngOnInit called');
    this.loadDoctorInfo();
    this.loadDashboardData();
    
    // Small delay to ensure everything is loaded
    setTimeout(() => {
      this.checkOnboardingStatus();
    }, 100);
  }

  private loadDoctorInfo(): void {
    const storedUser = localStorage.getItem('currentUser');
    console.log('🟢 DashboardDoctor: storedUser =', storedUser);
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.doctorName = `Dr. ${user.firstName} ${user.lastName}`;
        console.log('🟢 DashboardDoctor: Loaded user:', user);
      } catch (error) {
        console.error('🔴 Error parsing user:', error);
      }
    }
  }

  private loadDashboardData(): void {
    this.loading = true;
    console.log('📊 Loading dashboard data...');

    // Get today's date for appointments
    const today = new Date();
    const dateString = this.formatDateForAPI(today);

    // Load all data in parallel
    forkJoin({
      connections: this.connectionService.getDoctorConnections(),
      todayAppointments: this.appointmentService.getDoctorAppointments(undefined, dateString),
      allAppointments: this.appointmentService.getDoctorAppointments(),
      conversations: this.messageService.getConversations()
    }).subscribe({
      next: (results) => {
        console.log('✅ Dashboard data loaded:', results);
        
        // Process connections (Total Patients)
        if (results.connections.success) {
          this.processConnections(results.connections.connections || []);
        }

        // Process today's appointments
        if (results.todayAppointments.success) {
          this.processTodayAppointments(results.todayAppointments.appointments || []);
        }

        // Process all appointments for pending reviews
        if (results.allAppointments.success) {
          this.processPendingReviews(results.allAppointments.appointments || []);
        }

        // Process conversations for unread messages
        if (results.conversations.success) {
          this.processUnreadMessages(results.conversations.conversations || []);
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading dashboard data:', error);
        this.loading = false;
        // Set error states
        this.stats[0].subtitle = 'Unable to load';
        this.stats[1].subtitle = 'Unable to load';
        this.stats[2].subtitle = 'Unable to load';
        this.stats[3].subtitle = 'Unable to load';
      }
    });
  }

  private processConnections(connections: any[]): void {
    // Count accepted connections (active patients)
    const activePatients = connections.filter(conn => 
      conn.status === 'accepted'
    ).length;

    // Count new connections this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = connections.filter(conn => 
      conn.status === 'accepted' && 
      new Date(conn.updatedAt) >= firstDayOfMonth
    ).length;

    this.stats[0].value = activePatients;
    this.stats[0].subtitle = newThisMonth > 0 
      ? `+${newThisMonth} this month` 
      : 'No new patients this month';

    console.log('👥 Total Patients:', activePatients, 'New:', newThisMonth);
  }

  private processTodayAppointments(appointments: Appointment[]): void {
    // Filter for today's confirmed and pending appointments
    const todayAppointments = appointments.filter(apt => 
      (apt.status === 'confirmed' || apt.status === 'pending')
    );

    // Count completed appointments today
    const completedToday = appointments.filter(apt => 
      apt.status === 'completed'
    ).length;

    // Calculate remaining appointments
    const remaining = todayAppointments.filter(apt => 
      apt.status !== 'completed'
    ).length;

    this.stats[1].value = todayAppointments.length;
    this.stats[1].subtitle = remaining > 0 
      ? `${remaining} remaining` 
      : completedToday > 0 
        ? `${completedToday} completed` 
        : 'No appointments today';

    console.log('📅 Today\'s Appointments:', todayAppointments.length, 'Remaining:', remaining);
  }

  private processPendingReviews(appointments: Appointment[]): void {
    // Count pending appointment requests (appointments waiting for doctor confirmation)
    const pendingReviews = appointments.filter(apt => 
      apt.status === 'pending'
    ).length;

    // Count upcoming appointments that might need preparation
    const now = new Date();
    const upcomingAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate > now && 
             (apt.status === 'confirmed' || apt.status === 'pending');
    });

    // Get next appointment
    let nextAppointmentText = '';
    if (upcomingAppointments.length > 0) {
      const sortedApts = upcomingAppointments.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const nextApt = sortedApts[0];
      const nextDate = new Date(nextApt.date);
      const today = new Date();
      
      if (this.isSameDay(nextDate, today)) {
        nextAppointmentText = `Next: Today at ${nextApt.startTime}`;
      } else if (this.isTomorrow(nextDate, today)) {
        nextAppointmentText = `Next: Tomorrow at ${nextApt.startTime}`;
      } else {
        nextAppointmentText = `Next: ${this.formatShortDate(nextDate)}`;
      }
    }

    this.stats[2].value = pendingReviews;
    this.stats[2].subtitle = pendingReviews > 0 
      ? `${pendingReviews} need${pendingReviews === 1 ? 's' : ''} confirmation`
      : nextAppointmentText || 'All up to date';

    console.log('📋 Pending Reviews:', pendingReviews);
  }

  private processUnreadMessages(conversations: any[]): void {
    // Count total unread messages across all conversations
    const totalUnread = conversations.reduce((sum, conv) => 
      sum + (conv.unreadCount || 0), 0
    );

    // Count conversations with unread messages
    const conversationsWithUnread = conversations.filter(conv => 
      (conv.unreadCount || 0) > 0
    ).length;

    this.stats[3].value = totalUnread;
    this.stats[3].subtitle = conversationsWithUnread > 0 
      ? `${conversationsWithUnread} conversation${conversationsWithUnread !== 1 ? 's' : ''}`
      : 'No new messages';

    console.log('💬 Unread Messages:', totalUnread, 'Conversations:', conversationsWithUnread);
  }

  // Helper methods
  private formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatShortDate(date: Date): string {
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private isTomorrow(date: Date, today: Date): boolean {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.isSameDay(date, tomorrow);
  }

  private checkOnboardingStatus(): void {
    console.log('🟢 DashboardDoctor: Checking onboarding status...');
    
    const storedUser = localStorage.getItem('currentUser');
    
    if (storedUser) {
      const user = JSON.parse(storedUser);
      console.log('🟢 User type:', user.userType);
      console.log('🟢 Is verified:', user.isVerified);
      
      // If doctor is not verified, show onboarding modal
      if (user.userType === 'doctor' && !user.isVerified) {
        console.log('🟢 ✅ Opening onboarding modal!');
        this.onboardingService.open();
      } else {
        console.log('🟡 User is verified or not a doctor - not showing onboarding');
      }
    } else {
      console.warn('🟡 No user found in localStorage');
    }
  }


}
