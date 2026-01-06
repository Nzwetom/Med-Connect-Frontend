import { Component , EventEmitter, Output} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../../services/onboarding';

@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step1.html',
  styleUrl: './step1.css',
})
export class Step1 {

  specialty = '';
  phone = '';
  hospital = '';
  experience = 0;
  fee = 0;

  constructor(private onboardingService: OnboardingService) {}

  ngOnInit(): void {
    // Load any previously saved data
    const savedData = this.onboardingService.getOnboardingData();
    
    if (savedData.specialty) {
      this.specialty = savedData.specialty;
    }
    if (savedData.phone) {
      this.phone = savedData.phone;
    }
    if (savedData.hospital) {
      this.hospital = savedData.hospital;
    }
    if (savedData.yearsOfExperience !== undefined) {
      this.experience = savedData.yearsOfExperience;
    }
    if (savedData.consultationFee !== undefined) {
      this.fee = savedData.consultationFee;
    }

    console.log('📋 Step1: Loaded data:', savedData);
  }

  close() {
    this.onboardingService.close();
  }

  next() {
    if (!this.specialty || !this.phone) {
      alert('Please fill in the required fields!');
      return;
    }

    // Save data to service
    this.onboardingService.saveStep1Data({
      specialty: this.specialty,
      phone: this.phone,
      hospital: this.hospital,
      yearsOfExperience: this.experience,
      consultationFee: this.fee
    });

    console.log('💾 Step1: Data saved');
    this.onboardingService.nextStep();
  }

}
