import { Component } from '@angular/core';
import { OnboardingService } from '../../services/onboarding';
import { Router } from '@angular/router';

@Component({
  selector: 'app-step4',
  standalone: true,
  imports: [],
  templateUrl: './step4.html',
  styleUrl: './step4.css',
})
export class Step4 {

  constructor(
    private router: Router,
    private onboardingService: OnboardingService
  ) {}

  goToDashboard() {
    this.onboardingService.close();
    this.router.navigate(['/doctor-dashboard']);
  }

}
