import { Component, OnInit} from '@angular/core';
import { OnboardingService } from '../../services/onboarding';
import { CommonModule } from '@angular/common';
import { Step1 } from '../../doctor-onboarding/step1/step1';
import { Step2 } from '../../doctor-onboarding/step2/step2';
import { Step3 } from '../../doctor-onboarding/step3/step3';
import { Step4 } from '../../doctor-onboarding/step4/step4';
import { RouterModule } from '@angular/router';



@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, Step1, Step2, Step3, Step4, RouterModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css'
})
export class OnboardingComponent implements OnInit {
 isOpen = false;
  currentStep = 1;

  constructor(public onboardingService: OnboardingService) {
    console.log('🔵 OnboardingComponent: Constructor called');
  }

  ngOnInit() {
    console.log('🔵 OnboardingComponent: ngOnInit called');
    
    this.onboardingService.open$.subscribe(open => {
      console.log('🔵 OnboardingComponent: isOpen changed to:', open);
      this.isOpen = open;
    });

    this.onboardingService.currentStep$.subscribe(step => {
      console.log('🔵 OnboardingComponent: currentStep changed to:', step);
      this.currentStep = step;
    });

    console.log('🔵 OnboardingComponent: Initial isOpen =', this.isOpen);
    console.log('🔵 OnboardingComponent: Initial currentStep =', this.currentStep);
  }

}
