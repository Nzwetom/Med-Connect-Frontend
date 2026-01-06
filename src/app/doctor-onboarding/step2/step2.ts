import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../../services/onboarding';

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  isOpen: boolean;
  slots: TimeSlot[];
}



@Component({
  selector: 'app-step2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step2.html',
  styleUrl: './step2.css',
})
export class Step2 {
 schedule: Record<string, DaySchedule> = {
    monday: { isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
    tuesday: { isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
    wednesday: { isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
    thursday: { isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
    friday: { isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
    saturday: { isOpen: false, slots: [] },
    sunday: { isOpen: false, slots: [] }
  };

  days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  slotDuration: number = 30;
  location: string = '';

  constructor(private onboardingService: OnboardingService) {}

  ngOnInit(): void {
    const savedData = this.onboardingService.getOnboardingData();

    if (savedData.availability) {
     let scheduleData: Record<string, TimeSlot[] | DaySchedule> =
      savedData.availability.schedule;

      // Handle if schedule is stored as JSON string
      if (typeof scheduleData === 'string') {
        try {
          scheduleData = JSON.parse(scheduleData);
        } catch (e) {
          console.error('Error parsing schedule:', e);
          scheduleData = this.schedule; // Use default
        }
      }

      // Convert schedule format if needed (backend format to UI format)
      const convertedSchedule: Record<string, DaySchedule> = {};
      
      for (const [day, value] of Object.entries(scheduleData)) {
        if (Array.isArray(value)) {
          // Backend format: day: [{start, end}] or []
          convertedSchedule[day] = {
            isOpen: value.length > 0,
            slots: value.length > 0 ? value : []
          };
        } else if (value && typeof value === 'object' && 'isOpen' in value) {
          // UI format: day: {isOpen, slots}
          convertedSchedule[day] = value as DaySchedule;
        } else {
          // Default
          convertedSchedule[day] = { isOpen: false, slots: [] };
        }
      }

      this.schedule = convertedSchedule;
      this.slotDuration = Number(savedData.availability.slotDuration) || 30;
      this.location = savedData.availability.location ?? '';
    }

    console.log('📋 Step2: Loaded schedule:', this.schedule);
  }

  toggleDay(dayKey: string): void {
    this.schedule[dayKey].isOpen = !this.schedule[dayKey].isOpen;
    
    if (this.schedule[dayKey].isOpen && this.schedule[dayKey].slots.length === 0) {
      this.schedule[dayKey].slots = [{ start: '09:00', end: '17:00' }];
    }
  }

  addSlot(dayKey: string): void {
    const lastSlot = this.schedule[dayKey].slots[this.schedule[dayKey].slots.length - 1];
    const newStart = lastSlot ? lastSlot.end : '09:00';
    const newEnd = this.addMinutesToTime(newStart, 60);
    
    this.schedule[dayKey].slots.push({ start: newStart, end: newEnd });
  }

  removeSlot(dayKey: string, index: number): void {
    if (this.schedule[dayKey].slots.length > 1) {
      this.schedule[dayKey].slots.splice(index, 1);
    } else {
      alert('You must have at least one time slot for open days');
    }
  }

  addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }

  isValidSchedule(): boolean {
    const hasOpenDay = Object.values(this.schedule).some(day => day.isOpen);
    
    if (!hasOpenDay) {
      return false;
    }

    for (const day of Object.values(this.schedule)) {
      if (day.isOpen) {
        for (const slot of day.slots) {
          if (!slot.start || !slot.end) {
            return false;
          }
          if (slot.start >= slot.end) {
            return false;
          }
        }
      }
    }

    return true;
  }

  close() {
    this.onboardingService.close();
  }

  back() {
    this.onboardingService.previousStep();
  }

  next() {
    if (!this.isValidSchedule()) {
      alert('Please set valid availability hours for at least one day');
      return;
    }

    if (this.slotDuration < 15 || this.slotDuration > 120) {
      alert('Slot duration must be between 15 and 120 minutes');
      return;
    }

    // Convert to backend format (day: array of slots)
    const backendSchedule: Record<string, TimeSlot[]> = {};
    for (const [key, value] of Object.entries(this.schedule)) {
      backendSchedule[key] = value.isOpen ? value.slots : [];
    }

    this.onboardingService.saveStep2Data({
      availability: {
        schedule: backendSchedule,
        slotDuration: this.slotDuration,
        location: this.location,
        bufferTime: 0
      }
    });
    
    console.log('💾 Step2: Saved availability:', backendSchedule);
    this.onboardingService.nextStep();
  }

  getDayStatus(dayKey: string): string {
    const day = this.schedule[dayKey];
    if (!day || !day.isOpen) return 'Closed';
    
    if (!day.slots || day.slots.length === 0) return 'Closed';
    
    return day.slots.map(slot => `${slot.start} - ${slot.end}`).join(', ');
  }
}
