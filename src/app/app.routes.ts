import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';

export const routes: Routes = [
  // ==========================================
  // PUBLIC ROUTES (No Authentication Required)
  // ==========================================
  { 
    path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },
  { 
    path: 'login', 
    component: Login 
  },
  { 
    path: 'signup', 
    component: Signup 
  },

  {
    path: 'account-settings',
    loadComponent: () => import('./pages/account-settings/account-settings')
      .then(m => m.AccountSettings)
  },

  // ==========================================
  // PATIENT ROUTES
  // ==========================================
  {
    path: 'patient-dashboard',
    loadComponent: () => import('./patient/dashboard/dashboard')
      .then(m => m.Dashboard)
  },
  {
    path: 'medical-records',
    loadComponent: () => import('./patient/records/records')
      .then(m => m.Records)
  },
  {
    path: 'medical-records/upload',
    loadComponent: () => import('./features/upload-doc/upload-doc')
      .then(m => m.UploadDoc)
  },
  {
    path: 'medical-records/:id',
    loadComponent: () => import('./features/detail/detail')
      .then(m => m.Detail)
  },
  {
    path: 'findDoctors',
    loadComponent: () => import('./patient/find-doctors/find-doctors')
      .then(m => m.FindDoctors)
  },
  {
    path: 'appointment',
    loadComponent: () => import('./patient/appointment/appointment')
      .then(m => m.Appointment)
  },

  // ==========================================
  // DOCTOR ROUTES
  // ==========================================
  {
    path: 'doctor-dashboard',
    loadComponent: () => import('./doctor/dashboard-doctor/dashboard-doctor')
      .then(m => m.DashboardDoctor)
  },
  // {
  //   path: 'doctor-dashboard/onboarding',
  //   loadComponent: () => import('./features/onboarding/onboarding')
  //     .then(m => m.OnboardingComponent)
  // },
  {
    path: 'doctor-patients',
    loadComponent: () => import('./doctor/patients/patients')
      .then(c => c.Patients)
  },
  {
    path: 'doctor-patients/:id',
    loadComponent: () => import('./doctor/patient-detail/patient-detail')
      .then(c => c.PatientDetail)
  },
  {
    path: 'doctor-schedule',
    loadComponent: () => import('./doctor/schedule/schedule')
      .then(m => m.Schedule)
  },
  {
    path: 'doctor-messages',
    loadComponent: () => import('./doctor/messages/messages')
      .then(m => m.Messages)
  },

  // ==========================================
  // FALLBACK ROUTE (404)
  // ==========================================
  { 
    path: '**', 
    redirectTo: '/login' 
  }
];