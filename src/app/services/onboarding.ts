import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';


export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  isOpen: boolean;
  slots: TimeSlot[];
}

export interface AvailabilityData {
  schedule: Record<string, TimeSlot[]>;
  slotDuration: number;
  location: string;
  bufferTime: number;
}
export interface OnboardingData {
  specialty?: string;
  phone?: string;
  hospital?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  availability?: AvailabilityData;
  bio?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OnboardingService { 

 private currentStepSubject = new BehaviorSubject<number>(1);
  currentStep$ = this.currentStepSubject.asObservable();

  private openSubject = new BehaviorSubject<boolean>(false);
  open$ = this.openSubject.asObservable();

  // Store onboarding data IN MEMORY ONLY
  private onboardingData: OnboardingData = {};
  
  // Track completion in memory
  private onboardingComplete = false;

  open() {
    this.openSubject.next(true);
  }

  close() {
    this.openSubject.next(false);
    this.currentStepSubject.next(1);
  }

  isOpen(): Observable<boolean> {
    return this.open$;
  }

  currentStep(): Observable<number> {
    return this.currentStep$;
  }

  // Save step data (in memory only)
  saveStep1Data(data: Partial<OnboardingData>) {
    this.onboardingData = { ...this.onboardingData, ...data };
    console.log('💾 Step1 data saved in memory:', this.onboardingData);
  }

  saveStep2Data(data: Partial<OnboardingData>) {
    this.onboardingData = { ...this.onboardingData, ...data };
    console.log('💾 Step2 data saved in memory:', this.onboardingData);
  }

  saveStep3Data(data: Partial<OnboardingData>) {
    this.onboardingData = { ...this.onboardingData, ...data };
    console.log('💾 Step3 data saved in memory:', this.onboardingData);
  }

  getOnboardingData(): OnboardingData {
    return { ...this.onboardingData };
  }

  clearData() {
    this.onboardingData = {};
    console.log('🗑️ Onboarding data cleared');
  }

  markComplete() {
    this.onboardingComplete = true;
    // Clear saved data after completion
    this.clearData();
    console.log('✅ Onboarding marked complete');
  }

  isComplete(): boolean {
    return this.onboardingComplete;
  }

  nextStep() {
    const step = this.currentStepSubject.value;
    if (step < 4) {
      this.currentStepSubject.next(step + 1);
    } else {
      this.close();
      this.markComplete();
    }
  }

  previousStep() {
    const step = this.currentStepSubject.value;
    if (step > 1) {
      this.currentStepSubject.next(step - 1);
    }
  }
  
  /**
   * Load existing doctor profile data into onboarding flow
   * Useful when doctor wants to edit their profile through onboarding
   */
  loadExistingProfile(doctorData: any) {
    this.onboardingData = {
      specialty: doctorData.specialty || '',
      phone: doctorData.phone || '',
      hospital: doctorData.hospital || '',
      yearsOfExperience: doctorData.yearsOfExperience || 0,
      consultationFee: doctorData.consultationFee || 0,
      bio: doctorData.bio || ''
    };
    console.log('📋 Existing profile loaded into onboarding:', this.onboardingData);
  }
  
}
