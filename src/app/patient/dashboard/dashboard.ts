import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { UploadDoc, DocumentResponse } from '../../services/upload-doc';
import { ConnectionService } from '../../services/connection';
import { AppointmentService, Appointment as AppointmentModel } from '../../services/appointment.service';
import { PatientProfileService } from '../../services/patient-profile';



interface StatCard {
  title: string;
  value: string | number;
  subtitle: string;
  iconType: string;
  iconColor: string;
  bgColor: string;
}

interface Document {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  date: string;
}

interface HealthInfo {
  iconType: string;
  iconBg: string;
  iconColor: string;
  title: string;
  value: string;
  badge?: string;
  badgeColor?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  hospital: string;
  availableToday: boolean;
  isConnected: boolean;
}

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SharedHeader, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit{

   userName: string = '';
  loading: boolean = true;
  
  stats: StatCard[] = [
    {
      title: 'Total Documents',
      value: 0,
      subtitle: 'Loading...',
      iconType: 'documents',
      iconColor: '#4A90E2',
      bgColor: '#EBF5FF'
    },
    {
      title: 'Connected Doctors',
      value: 0,
      subtitle: 'Loading...',
      iconType: 'doctors',
      iconColor: '#5FB3B3',
      bgColor: '#E8F8F8'
    },
    {
      title: 'Upcoming Appointments',
      value: 0,
      subtitle: 'Loading...',
      iconType: 'appointments',
      iconColor: '#4ECDC4',
      bgColor: '#E6F9F7'
    },
    {
      title: 'Health Score',
      value: '--',
      subtitle: 'Loading...',
      iconType: 'health',
      iconColor: '#28A745',
      bgColor: '#E8F5E9'
    }
  ];

  recentDocuments: Document[] = [];
  healthSummary: HealthInfo[] = [];

  healthTip = {
    title: 'Health Tip of the Day',
    content: 'Stay hydrated! Drinking adequate water helps maintain healthy organ function and improves overall well-being.',
    visible: true
  };

  // Category mapping
  private categoryColors: { [key: string]: string } = {
    'lab_results': '#4A90E2',
    'imaging': '#5FB3B3',
    'prescription': '#FFA07A',
    'clinical_notes': '#9B59B6',
    'vaccination_records': '#28A745',
    'others': '#6C757D'
  };

  private categoryLabels: { [key: string]: string } = {
    'lab_results': 'Lab Results',
    'imaging': 'Imaging',
    'prescription': 'Prescription',
    'clinical_notes': 'Clinical Notes',
    'vaccination_records': 'Vaccination Records',
    'others': 'Other'
  };

  constructor(
    private router: Router,
    private uploadDocService: UploadDoc,
    private connectionService: ConnectionService,
    private appointmentService: AppointmentService,
    private patientProfileService: PatientProfileService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadDashboardData();
  }

  loadUserData(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userName = `${user.firstName} ${user.lastName}`;
    }
  }

  loadDashboardData(): void {
    this.loading = true;

    // Load all dashboard data in parallel
    forkJoin({
      documents: this.uploadDocService.getMyDocuments(),
      connections: this.connectionService.getPatientConnections(),
      appointments: this.appointmentService.getPatientAppointments(),
      profile: this.patientProfileService.getMyProfile()
    }).subscribe({
      next: (results) => {
        console.log('✅ Dashboard data loaded:', results);
        
        // Process documents
        if (results.documents) {
          this.processDocuments(results.documents);
        }

        // Process connections
        if (results.connections.success) {
          this.processConnections(results.connections.connections || []);
        }

        // Process appointments
        if (results.appointments.success) {
          this.processAppointments(results.appointments.appointments || []);
        }

        // Process health profile
        if (results.profile.success && results.profile.patient) {
          this.processHealthProfile(results.profile.patient);
        }

        // Calculate health score
        this.calculateHealthScore(results.profile.patient);

        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading dashboard data:', error);
        this.loading = false;
        // Set default values on error
        this.stats[0].subtitle = 'Unable to load';
        this.stats[1].subtitle = 'Unable to load';
        this.stats[2].subtitle = 'Unable to load';
        this.stats[3].subtitle = 'Unable to load';
      }
    });
  }

  processDocuments(documents: DocumentResponse[]): void {
    // Update total documents stat
    this.stats[0].value = documents.length;
    
    // Calculate documents added this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const docsThisMonth = documents.filter(doc => 
      new Date(doc.docDate) >= firstDayOfMonth
    ).length;
    
    this.stats[0].subtitle = docsThisMonth > 0 
      ? `+${docsThisMonth} this month` 
      : 'No new documents this month';

    // Get 4 most recent documents
    const sortedDocs = [...documents].sort((a, b) => 
      new Date(b.docDate).getTime() - new Date(a.docDate).getTime()
    );

    this.recentDocuments = sortedDocs.slice(0, 4).map(doc => ({
      id: doc._id,
      title: doc.docTitle,
      category: this.categoryLabels[doc.category] || doc.category,
      categoryColor: this.categoryColors[doc.category] || '#6C757D',
      date: this.formatDate(doc.docDate)
    }));
  }

  processConnections(connections: any[]): void {
    // Count accepted connections
    const acceptedConnections = connections.filter(conn => 
      conn.status === 'accepted'
    ).length;
    
    this.stats[1].value = acceptedConnections;
    
    // Count active connections (those with recent activity)
    const activeCount = connections.filter(conn => 
      conn.status === 'accepted' && conn.lastMessageDate
    ).length;
    
    this.stats[1].subtitle = activeCount > 0 
      ? `${activeCount} active` 
      : 'No active connections';
  }

  processAppointments(appointments: AppointmentModel[]): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filter upcoming appointments
    const upcomingAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate >= now && 
             apt.status !== 'cancelled' && 
             apt.status !== 'completed' &&
             apt.status !== 'rejected';
    });

    this.stats[2].value = upcomingAppointments.length;

    // Get next appointment date
    if (upcomingAppointments.length > 0) {
      const sortedApts = upcomingAppointments.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const nextApt = sortedApts[0];
      const nextDate = new Date(nextApt.date);
      this.stats[2].subtitle = `Next: ${this.formatShortDate(nextDate)}`;
    } else {
      this.stats[2].subtitle = 'No upcoming appointments';
    }
  }

  processHealthProfile(patient: any): void {
    this.healthSummary = [];

    // Blood Type
    if (patient.bloodType) {
      this.healthSummary.push({
        iconType: 'droplet',
        iconBg: '#EBF5FF',
        iconColor: '#4A90E2',
        title: 'Blood Type',
        value: patient.bloodType
      });
    }

    // Allergies
    if (patient.allergies && patient.allergies.length > 0) {
      const allergyNames = patient.allergies
        .map((a: any) => a.name)
        .slice(0, 2)
        .join(', ');
      
      const hasSevereAllergy = patient.allergies.some((a: any) => 
        a.severity === 'severe'
      );

      this.healthSummary.push({
        iconType: 'alert',
        iconBg: '#FFEBEE',
        iconColor: '#DC3545',
        title: 'Allergies',
        value: allergyNames + (patient.allergies.length > 2 ? '...' : ''),
        badge: hasSevereAllergy ? 'Severe' : 'Important',
        badgeColor: hasSevereAllergy ? '#DC3545' : '#FF9800'
      });
    }

    // Current Medications
    if (patient.currentMedications && patient.currentMedications.length > 0) {
      this.healthSummary.push({
        iconType: 'pill',
        iconBg: '#F3E5F5',
        iconColor: '#9B59B6',
        title: 'Current Medications',
        value: `${patient.currentMedications.length} prescription${patient.currentMedications.length > 1 ? 's' : ''}`
      });
    }

    // If no health info, show placeholder
    if (this.healthSummary.length === 0) {
      this.healthSummary.push({
        iconType: 'alert',
        iconBg: '#FFF4E6',
        iconColor: '#FF9800',
        title: 'Health Profile',
        value: 'Complete your profile',
        badge: 'Action Required',
        badgeColor: '#FF9800'
      });
    }
  }

  calculateHealthScore(patient: any): void {
    if (!patient) {
      this.stats[3].value = '--';
      this.stats[3].subtitle = 'Complete profile to see score';
      return;
    }

    let score = 0;
    let maxScore = 100;

    // Profile completeness (40 points)
    if (patient.dateOfBirth) score += 10;
    if (patient.gender) score += 10;
    if (patient.bloodType) score += 10;
    if (patient.emergencyContact?.name) score += 10;

    // Medical history (30 points)
    if (patient.allergies && patient.allergies.length > 0) score += 15;
    if (patient.currentMedications) score += 15;

    // Activity (30 points)
    // You can expand this based on recent appointments, document uploads, etc.
    score += 30; // Default for now

    const percentage = Math.round((score / maxScore) * 100);
    this.stats[3].value = `${percentage}%`;
    
    if (percentage >= 80) {
      this.stats[3].subtitle = 'Excellent';
      this.stats[3].iconColor = '#28A745';
    } else if (percentage >= 60) {
      this.stats[3].subtitle = 'Good condition';
      this.stats[3].iconColor = '#28A745';
    } else if (percentage >= 40) {
      this.stats[3].subtitle = 'Fair';
      this.stats[3].iconColor = '#FFC107';
    } else {
      this.stats[3].subtitle = 'Needs improvement';
      this.stats[3].iconColor = '#FF9800';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatShortDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  viewAllDocuments(): void {
    this.router.navigate(['/medical-records']);
  }

  viewDocument(docId: string): void {
    this.router.navigate(['/medical-records', docId]);
  }

  downloadDocument(docId: string, event: Event): void {
    event.stopPropagation();
    console.log('Downloading document:', docId);
    // TODO: Implement download functionality
    alert('Download feature coming soon!');
  }

  showMoreOptions(docId: string, event: Event): void {
    event.stopPropagation();
    console.log('More options for:', docId);
    // TODO: Implement more options menu
  }

  scheduleAppointment(): void {
    this.router.navigate(['/findDoctors']);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
  

}
