import { CommonModule } from '@angular/common';
import { Component , OnInit } from '@angular/core';
import { FormBuilder, FormGroup,  Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedHeader } from '../shared-header/shared-header';
import { UploadDoc as UploadDocService} from '../../services/upload-doc'

@Component({
  selector: 'app-upload-doc',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SharedHeader],
  templateUrl: './upload-doc.html',
  styleUrl: './upload-doc.css',
})
export class UploadDoc implements OnInit {
uploadForm: FormGroup;
  selectedFile: File | null = null;
  filePreview: string | null = null;
  uploading: boolean = false;
  uploadProgress: number = 0;
  errorMessage: string = '';

  categories = [
    { value: '', label: 'Select Category', disabled: true },
    { value: 'lab_results', label: 'Lab Results', color: '#4A90E2' },
    { value: 'imaging', label: 'Imaging (X-Ray, MRI, CT)', color: '#5FB3B3' },
    { value: 'prescription', label: 'Prescription', color: '#FFA07A' },
    { value: 'clinical_notes', label: 'Clinical Notes', color: '#9B59B6' },
    { value: 'vaccination_records', label: 'Vaccination Record', color: '#28A745' },
    { value: 'others', label: 'Other', color: '#6C757D' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private uploadDocService: UploadDocService
  ) {
    this.uploadForm = this.formBuilder.group({
      docTitle: ['', [Validators.required, Validators.minLength(3)]],
      category: ['', Validators.required],
      docDate: ['', Validators.required],
      description: ['', Validators.maxLength(500)]
    });
  }

  onSubmit(): void {

// Validate form and file
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file to upload.';
      return;
    }

    if (this.uploadForm.valid && this.selectedFile) {
      this.uploading = true;
      this.errorMessage = '';

      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('docTitle', this.uploadForm.value.docTitle);
      formData.append('docDate', this.uploadForm.value.docDate);
      formData.append('category', this.uploadForm.value.category);
      
      if (this.uploadForm.value.description) {
        formData.append('description', this.uploadForm.value.description);
      }

      // Debug log
    console.log('Submitting form with:', {
      docTitle: this.uploadForm.value.docTitle,
      category: this.uploadForm.value.category,
      docDate: this.uploadForm.value.docDate,
      fileName: this.selectedFile.name,
      fileSize: this.selectedFile.size
    });

      this.uploadDocService.uploadDocument(formData).subscribe({
        next: (response) => {
          console.log('Upload successful:', response);
          this.uploading = false;
          this.router.navigate(['/medical-records']);
        },
        error: (error) => {
          console.error('Upload failed:', error);
          this.errorMessage = error.error?.error || 'Upload failed. Please try again.';
          this.uploading = false;
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.uploadForm.controls).forEach(key => {
        this.uploadForm.get(key)?.markAsTouched();
      });

      if (!this.selectedFile) {
        this.errorMessage = 'Please select a file to upload.';
      }
    }
  }


  ngOnInit(): void {
 // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      this.router.navigate(['/login']);
    }

  }

  get docTitle() {
    return this.uploadForm.get('docTitle');
  }

  get category() {
    return this.uploadForm.get('category');
  }

  get docDate() {
    return this.uploadForm.get('docDate');
  }

  get description() {
    return this.uploadForm.get('description');
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.validateAndSetFile(file);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.validateAndSetFile(files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  validateAndSetFile(file: File): void {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Invalid file type. Please upload PDF, JPG, or PNG files only.';
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      this.errorMessage = 'File size exceeds 10MB limit. Please choose a smaller file.';
      return;
    }

    this.errorMessage = '';
    this.selectedFile = file;

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.filePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.filePreview = null;
    }

    // Auto-fill title if empty
    if (!this.uploadForm.get('title')?.value) {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      this.uploadForm.patchValue({ title: fileName });
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
    this.errorMessage = '';
  }


  cancel(): void {
    this.router.navigate(['medical-records']);
  }

  logout(): void {
    this.router.navigate(['login']);
  }
}
