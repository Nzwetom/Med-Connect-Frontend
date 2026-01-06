import { CommonModule } from '@angular/common';
import { Component , OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedHeader } from '../shared-header/shared-header';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UploadDoc, DocumentResponse } from '../../services/upload-doc';
import { environment } from '../../../environments/environment';

interface DocumentDetail {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  date: string;
  fileSize: string;
  uploadedDate: string;
  fileUrl: string;
  safeFileUrl?: SafeResourceUrl;
  fileType: string;
  description?: string;
}

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, SharedHeader],
  templateUrl: './detail.html',
  styleUrl: './detail.css',
})
export class Detail implements OnInit{

  documentId: string = '';
  document: DocumentDetail | null = null;
  loading: boolean = true;
  showDeleteConfirm: boolean = false;

  // Category color mapping
  private categoryColors: { [key: string]: string } = {
    'lab_results': '#4A90E2',
    'imaging': '#5FB3B3',
    'prescription': '#FFA07A',
    'clinical_notes': '#9B59B6',
    'vaccination_records': '#28A745',
    'others': '#6C757D'
  };

  // Category label mapping
  private categoryLabels: { [key: string]: string } = {
    'lab_results': 'Lab Results',
    'imaging': 'Imaging',
    'prescription': 'Prescription',
    'clinical_notes': 'Clinical Notes',
    'vaccination_records': 'Vaccination Records',
    'others': 'Other'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private uploadDocService: UploadDoc,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.documentId = this.route.snapshot.paramMap.get('id') || '';
    this.loadDocument();
  }

  loadDocument(): void {
    this.uploadDocService.getDocumentById(this.documentId).subscribe({
      next: (response: DocumentResponse) => {
        this.document = this.mapResponseToDetail(response);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading document:', error);
        this.loading = false;
        this.document = null;
      }
    });
  }


   private mapResponseToDetail(response: DocumentResponse): DocumentDetail {
    // Build full URL for file
    const fileUrl = `${environment.apiUrl.replace('/api', '')}${response.fileUrl}`;
    
    // Determine file type
    const extension = response.fileUrl.split('.').pop()?.toLowerCase();
    let fileType = 'application/octet-stream';
    if (extension === 'pdf') {
      fileType = 'application/pdf';
    } else if (['jpg', 'jpeg'].includes(extension || '')) {
      fileType = 'image/jpeg';
    } else if (extension === 'png') {
      fileType = 'image/png';
    }

    // Format dates
    const docDate = new Date(response.docDate);
    const uploadDate = new Date(response.createdAt);

    return {
      id: response._id,
      title: response.docTitle,
      category: this.categoryLabels[response.category] || response.category,
      categoryColor: this.categoryColors[response.category] || '#6C757D',
      date: docDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      uploadedDate: uploadDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      fileSize: 'N/A', // Size not provided by backend
      fileUrl: fileUrl,
      safeFileUrl: fileType === 'application/pdf' 
        ? this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl)
        : undefined,
      fileType: fileType,
      description: response.description
    };
  }

  downloadDocument(): void {
    if (this.document) {
      console.log('Downloading:', this.document.title);
      // TODO: Implement actual download logic
      window.open(this.document.fileUrl, '_blank');
    }
  }

  shareDocument(): void {
    console.log('Share document:', this.documentId);
    // TODO: Implement share functionality
  }

  deleteDocument(): void {
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    this.uploadDocService.deleteDocument(this.documentId).subscribe({
      next: (response) => {
        console.log('Document deleted:', response);
        this.router.navigate(['/medical-records']);
      },
      error: (error) => {
        console.error('Error deleting document:', error);
        alert('Failed to delete document. Please try again.');
        this.showDeleteConfirm = false;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  goBack(): void {
    this.router.navigate(['medical-records']);
  }

  logout(): void {
    this.router.navigate(['login']);
  }

}
