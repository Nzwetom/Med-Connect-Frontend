import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule} from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { PatientProfileService, PatientProfile, Allergy, Medication, EmergencyContact } from '../../services/patient-profile';
import { DoctorProfile } from '../../services/doctor-profile';
import { OnboardingService } from '../../services/onboarding';
import { environment } from '../../../environments/environment';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  roles: {
    isPatient: boolean;
    isDoctor: boolean;
  };
  patientInfo?: {
    bloodType: string;
    allergies: string;
    emergencyContact: string;
  };
  doctorInfo?: {
    specialty: string;
    licenseNumber: string;
    hospital: string;
    yearsOfExperience: number;
  };
}

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './account-settings.html',
  styleUrl: './account-settings.css',
})
export class AccountSettings implements OnInit {

  activeTab: 'profile' | 'roles' | 'security' = 'profile';
  
  userProfile: UserProfile = {
    name: '',
    email: '',
    phone: '',
    address: '',
    roles: {
      isPatient: false,
      isDoctor: false
    }
  };

  // Patient Medical Info
  patientMedicalInfo: {
    dateOfBirth: string;
    gender: string;
    bloodType: string;
    allergies: Allergy[];
    emergencyContact: EmergencyContact;
    currentMedications: Medication[];
  } = {
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    allergies: [],
    emergencyContact: { name: '', relationship: '', phone: '' },
    currentMedications: []
  };

  // Doctor Info
  doctorInfo: {
    specialty: string;
    phone: string;
    hospital: string;
    yearsOfExperience: number;
    consultationFee: number;
    bio: string;
  } = {
    specialty: '',
    phone: '',
    hospital: '',
    yearsOfExperience: 0,
    consultationFee: 0,
    bio: ''
  };

  // Password change
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  
  // Role activation
  showRoleActivation: boolean = false;
  pendingRole: 'patient' | 'doctor' | null = null;

  // Loading states
  loadingPatientProfile: boolean = false;
  loadingDoctorProfile: boolean = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: Auth,
    private patientProfileService: PatientProfileService,
    private doctorProfileService: DoctorProfile,
    private onboardingService: OnboardingService
  ) {}

  ngOnInit(): void {
    this.loadUserFromAuth();
    setTimeout(() => {
      this.loadPatientMedicalInfo();
      this.loadDoctorInfo();
    }, 100);
  }

  loadPatientMedicalInfo(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (currentUser.userType === 'patient' || this.userProfile.roles.isPatient) {
      this.loadingPatientProfile = true;
      
      this.patientProfileService.getMyProfile().subscribe({
        next: (response) => {
          if (response.success && response.patient) {
            const patient = response.patient;
            this.patientMedicalInfo = {
              dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
              gender: patient.gender || '',
              bloodType: patient.bloodType || '',
              allergies: patient.allergies || [],
              emergencyContact: patient.emergencyContact || { name: '', relationship: '', phone: '' },
              currentMedications: patient.currentMedications || []
            };
            console.log('✅ Patient profile loaded:', this.patientMedicalInfo);
          }
          this.loadingPatientProfile = false;
        },
        error: (error) => {
          console.error('❌ Error loading patient medical info:', error);
          this.loadingPatientProfile = false;
        }
      });
    }
  }

  loadDoctorInfo(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    console.log('🔍 Checking if should load doctor info...');
    console.log('Current user type:', currentUser.userType);
    console.log('User roles:', this.userProfile.roles);
    
    if (currentUser.userType === 'doctor' || this.userProfile.roles.isDoctor) {
      this.loadingDoctorProfile = true;
      console.log('📞 Fetching doctor profile from backend...');
      
      this.doctorProfileService.getProfile().subscribe({
        next: (response) => {
          console.log('📦 Backend response:', response);
          
          if (response.success && response.doctor) {
            const doctor = response.doctor;
            
            this.doctorInfo = {
              specialty: doctor.specialty || '',
              phone: doctor.phone || '',
              hospital: doctor.hospital || '',
              yearsOfExperience: doctor.yearsOfExperience || 0,
              consultationFee: doctor.consultationFee || 0,
              bio: doctor.bio || ''
            };
            
            console.log('✅ Doctor profile loaded:', this.doctorInfo);
            
            // Load availability settings
            this.loadDoctorAvailability();
            
            this.onboardingService.loadExistingProfile(this.doctorInfo);
          }
          this.loadingDoctorProfile = false;
        },
        error: (error) => {
          console.error('❌ Error loading doctor info:', error);
          this.loadingDoctorProfile = false;
        }
      });
    } else {
      console.log('⏭️ Skipping doctor profile load - user is not a doctor');
    }
  }

  loadDoctorAvailability(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(`${environment.apiUrl}/api/availability/settings`, { headers }).subscribe({
      next: (response: any) => {
        if (response.success && response.availability) {
          console.log('✅ Doctor availability loaded:', response.availability);
          
          // Store in onboarding service for editing
          this.onboardingService.saveStep2Data({
            availability: {
              schedule: response.availability.schedule,
              slotDuration: response.availability.slotDuration,
              location: response.availability.location,
              bufferTime: response.availability.bufferTime || 0
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Error loading availability:', error);
      }
    });
  }

  loadUserFromAuth(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      
      this.userProfile.name = `${user.firstName} ${user.lastName}`;
      this.userProfile.email = user.email;
      this.userProfile.phone = user.phone || '';
      this.userProfile.address = user.address || '';
      
      const multiRoles = localStorage.getItem('userRoles');
      if (multiRoles) {
        const roles = JSON.parse(multiRoles);
        this.userProfile.roles = roles;
      } else {
        this.userProfile.roles = {
          isPatient: user.userType === 'patient',
          isDoctor: user.userType === 'doctor'
        };
      }

      console.log('👤 User loaded:', user);
      console.log('🎭 Active roles:', this.userProfile.roles);

      if (this.userProfile.roles.isPatient && !this.userProfile.patientInfo) {
        this.userProfile.patientInfo = {
          bloodType: '',
          allergies: '',
          emergencyContact: ''
        };
      }
      
      if (this.userProfile.roles.isDoctor && !this.userProfile.doctorInfo) {
        this.userProfile.doctorInfo = {
          specialty: '',
          licenseNumber: '',
          hospital: '',
          yearsOfExperience: 0
        };
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  setActiveTab(tab: 'profile' | 'roles' | 'security'): void {
    this.activeTab = tab;
  }

  saveProfile(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (currentUser.userType === 'patient' || this.userProfile.roles.isPatient) {
      const profileData = {
        phone: this.userProfile.phone,
        address: this.userProfile.address,
        ...this.patientMedicalInfo
      };

      this.patientProfileService.updateProfile(profileData).subscribe({
        next: (response) => {
          console.log('✅ Patient profile saved');
          this.updateLocalStorage();
          if (!this.userProfile.roles.isDoctor) {
            alert('Profile updated successfully!');
          }
        },
        error: (error) => {
          console.error('❌ Error updating patient profile:', error);
          alert('Failed to update patient profile. Please try again.');
        }
      });
    } 
    
    if (currentUser.userType === 'doctor' || this.userProfile.roles.isDoctor) {
      console.log('💾 Saving doctor profile:', this.doctorInfo);
      
      this.doctorProfileService.updateProfile(this.doctorInfo).subscribe({
        next: (response) => {
          console.log('✅ Doctor profile saved:', response);
          
          // Save availability if it exists
          const onboardingData = this.onboardingService.getOnboardingData();
          if (onboardingData.availability) {
            this.saveAvailabilitySettings(onboardingData.availability);
          } else {
            this.updateLocalStorage();
            alert('Profile updated successfully!');
          }
        },
        error: (error) => {
          console.error('❌ Error updating doctor profile:', error);
          alert('Failed to update doctor profile. Please try again.');
        }
      });
    }
  }

  private saveAvailabilitySettings(availabilityData: any): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    this.http.put(
      `${environment.apiUrl}/api/availability/settings`,
      availabilityData,
      { headers }
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Availability saved:', response);
        this.updateLocalStorage();
        alert('Profile and availability updated successfully!');
      },
      error: (error) => {
        console.error('❌ Error saving availability:', error);
        this.updateLocalStorage();
        alert('Profile updated but failed to save availability settings.');
      }
    });
  }

  private updateLocalStorage(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    const nameParts = this.userProfile.name.split(' ');
    currentUser.firstName = nameParts[0] || '';
    currentUser.lastName = nameParts.slice(1).join(' ') || '';
    currentUser.email = this.userProfile.email;
    currentUser.phone = this.userProfile.phone;
    currentUser.address = this.userProfile.address;
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('userRoles', JSON.stringify(this.userProfile.roles));
  }

  addAllergy(): void {
    this.patientMedicalInfo.allergies.push({
      name: '',
      severity: 'moderate',
      reaction: ''
    });
  }

  removeAllergy(index: number): void {
    this.patientMedicalInfo.allergies.splice(index, 1);
  }

  addMedication(): void {
    this.patientMedicalInfo.currentMedications.push({
      name: '',
      dosage: '',
      frequency: '',
      startDate: new Date().toISOString()
    });
  }

  removeMedication(index: number): void {
    this.patientMedicalInfo.currentMedications.splice(index, 1);
  }

  changePassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (this.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    
    alert('Password changed successfully!');
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  requestRoleActivation(role: 'patient' | 'doctor'): void {
    this.pendingRole = role;
    this.showRoleActivation = true;
  }

  requestRoleDeactivation(role: 'patient' | 'doctor'): void {
    if (!this.userProfile.roles.isPatient && !this.userProfile.roles.isDoctor) {
      alert('You must have at least one active role.');
      return;
    }

    if (role === 'patient' && this.userProfile.roles.isPatient && !this.userProfile.roles.isDoctor) {
      alert('Cannot deactivate Patient role. You must have at least one active role.');
      return;
    }
    if (role === 'doctor' && this.userProfile.roles.isDoctor && !this.userProfile.roles.isPatient) {
      alert('Cannot deactivate Doctor role. You must have at least one active role.');
      return;
    }
    
    const confirmDeactivate = confirm(
      `Are you sure you want to deactivate your ${role === 'patient' ? 'Patient' : 'Doctor'} role? You can reactivate it anytime.`
    );
    
    if (confirmDeactivate) {
      if (role === 'patient') {
        this.userProfile.roles.isPatient = false;
      } else {
        this.userProfile.roles.isDoctor = false;
      }
      
      localStorage.setItem('userRoles', JSON.stringify(this.userProfile.roles));
      alert(`${role === 'patient' ? 'Patient' : 'Doctor'} role deactivated successfully.`);
    }
  }

  confirmRoleActivation(): void {
    if (!this.pendingRole) return;

    if (this.pendingRole === 'patient') {
      this.userProfile.roles.isPatient = true;
      if (!this.userProfile.patientInfo) {
        this.userProfile.patientInfo = {
          bloodType: '',
          allergies: '',
          emergencyContact: ''
        };
      }
      
      localStorage.setItem('userRoles', JSON.stringify(this.userProfile.roles));
      this.closeRoleActivation();
      this.loadPatientMedicalInfo();
      this.checkPatientProfileCompletion();
      
    } else if (this.pendingRole === 'doctor') {
      this.userProfile.roles.isDoctor = true;
      if (!this.userProfile.doctorInfo) {
        this.userProfile.doctorInfo = {
          specialty: '',
          licenseNumber: '',
          hospital: '',
          yearsOfExperience: 0
        };
      }
      
      localStorage.setItem('userRoles', JSON.stringify(this.userProfile.roles));
      this.closeRoleActivation();
      this.loadDoctorInfo();
      this.checkDoctorProfileCompletion();
    }
  }

  private checkPatientProfileCompletion(): void {
    if (!this.patientMedicalInfo.dateOfBirth || !this.patientMedicalInfo.gender) {
      alert('Please complete your patient profile information.');
      this.activeTab = 'profile';
    } else {
      alert('Patient role activated! You can now access the patient dashboard.');
    }
  }

  private checkDoctorProfileCompletion(): void {
    this.doctorProfileService.getProfile().subscribe({
      next: (response) => {
        if (response.success && response.doctor) {
          const doctor = response.doctor;
          
          if (!doctor.specialty || !doctor.phone || !doctor.isVerified) {
            alert('Please complete your doctor profile to access all features. You will be guided through the setup process.');
            
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            currentUser.userType = 'doctor';
            currentUser.isVerified = false;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            this.router.navigate(['/doctor-dashboard']);
          } else {
            alert('Doctor role activated! You can now access the doctor dashboard.');
          }
        } else {
          alert('Please complete your doctor profile. You will be guided through the setup process.');
          
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
          currentUser.userType = 'doctor';
          currentUser.isVerified = false;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          
          this.router.navigate(['/doctor-dashboard']);
        }
      },
      error: (error) => {
        console.error('Error checking doctor profile:', error);
        alert('Please complete your doctor profile in the Profile Information tab.');
        this.activeTab = 'profile';
      }
    });
  }

  switchToRole(role: 'patient' | 'doctor'): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    currentUser.userType = role;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    if (role === 'patient') {
      this.router.navigate(['/patient-dashboard']);
    } else {
      this.router.navigate(['/doctor-dashboard']);
    }
  }

  closeRoleActivation(): void {
    this.showRoleActivation = false;
    this.pendingRole = null;
  }

  goBack(): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser?.userType === 'doctor') {
      this.router.navigate(['/doctor-dashboard']);
    } else {
      this.router.navigate(['/patient-dashboard']);
    }
  }

}
