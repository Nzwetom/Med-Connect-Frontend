import { Component, OnInit} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { UploadDoc, DocumentResponse } from '../../services/upload-doc';

interface MedicalDocument {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  date: string;
  fileSize: string;
}

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedHeader, RouterModule],
  templateUrl: './records.html',
  styleUrl: './records.css',
})
export class Records implements OnInit{
  userName: string = '';
  searchQuery: string = '';
  selectedCategory: string = 'all';
  loading: boolean = true;
  
   categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'lab_results', label: 'Lab Results', color: '#4A90E2' },
    { value: 'imaging', label: 'Imaging', color: '#5FB3B3' },
    { value: 'prescription', label: 'Prescription', color: '#FFA07A' },
    { value: 'clinical_notes', label: 'Clinical Notes', color: '#9B59B6' },
    { value: 'vaccination_records', label: 'Vaccination Records', color: '#28A745' },
    { value: 'others', label: 'Other', color: '#6C757D' }
  ];

  // Category label mapping
  private categoryLabels: { [key: string]: string } = {
    'lab_results': 'Lab Results',
    'imaging': 'Imaging',
    'prescription': 'Prescription',
    'clinical_notes': 'Clinical Notes',
    'vaccination_records': 'Vaccination Records',
    'others': 'Other'
  };

 
  allDocuments: MedicalDocument[] = [];
  filteredDocuments: MedicalDocument[] = [];

  constructor(
    private router: Router,
    private uploadDocService: UploadDoc
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loading = true;
    this.uploadDocService.getMyDocuments().subscribe({
      next: (documents: DocumentResponse[]) => {
        this.allDocuments = documents.map(doc => this.mapDocumentResponse(doc));
        this.filteredDocuments = [...this.allDocuments];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.loading = false;
        // Show empty state or error message
        this.allDocuments = [];
        this.filteredDocuments = [];
      }
    });
  }

  private mapDocumentResponse(doc: DocumentResponse): MedicalDocument {
    const category = this.categories.find(c => c.value === doc.category);
    const docDate = new Date(doc.docDate);
    
    return {
      id: doc._id,
      title: doc.docTitle,
      category: this.categoryLabels[doc.category] || doc.category,
      categoryColor: category?.color || '#6C757D',
      date: docDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      fileSize: 'N/A' // Backend doesn't provide file size
    };
  }

  onSearch(): void {
    this.filterDocuments();
  }

  onCategoryChange(): void {
    this.filterDocuments();
  }

  filterDocuments(): void {
    this.filteredDocuments = this.allDocuments.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.selectedCategory === 'all' || 
                             doc.category.toLowerCase().includes(this.selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }

  uploadDocument(): void {
    // FIXED: Use correct route path that matches app.routes.ts
    this.router.navigate(['/medical-records/upload']);
  }

  viewDocument(docId: string): void {
    // FIXED: Use correct route path that matches app.routes.ts
    this.router.navigate(['/medical-records', docId]);
  }

  logout(): void {
    this.router.navigate(['/login']);
  }

  getCategoryColor(category: string): string {
    const cat = this.categories.find(c => 
      category.toLowerCase().includes(c.value)
    );
    return cat?.color || '#666';
  }

}
