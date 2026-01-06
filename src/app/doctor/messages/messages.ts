import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit  } from '@angular/core';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { FormsModule } from '@angular/forms';
import { MessageService, Message, Conversation } from '../../services/message';
import { ConnectionService } from '../../services/connection';

interface DisplayMessage {
  text: string;
  time: string;
  isDoctor: boolean;
  hasAttachment?: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, SharedHeader, FormsModule],
  templateUrl: './messages.html',
  styleUrl: './messages.css',
})
export class Messages implements AfterViewChecked, OnInit {
  doctorName: string = '';
  currentUserId: string = '';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('messagesArea') messagesArea!: ElementRef<HTMLDivElement>;

  conversations: any[] = [];
  selectedConversation: any = null;
  messages: DisplayMessage[] = [];
   
  // Message input properties
  messageText: string = '';
  attachedFile: File | null = null;
  searchQuery: string = '';
  isTyping: boolean = false;
  isLoading: boolean = false;
  private shouldScrollToBottom: boolean = false;
  private pollingInterval: any;

  constructor(
    private messageService: MessageService,
    private connectionService: ConnectionService
  ) {}

  ngOnInit(): void {
    this.loadDoctorInfo();
    this.loadConversations();
    
    // Poll for new messages every 5 seconds
    this.pollingInterval = setInterval(() => {
      if (this.selectedConversation) {
        this.loadMessages(this.selectedConversation.connectionId, false);
      }
      // Also refresh conversations to update last message and unread counts
      this.loadConversations();
    }, 5000);
  }

  ngOnDestroy(): void {
    // Clean up polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  loadDoctorInfo(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.currentUserId = user.id || user._id;
      this.doctorName = `Dr. ${user.firstName} ${user.lastName}`;
      console.log('👨‍⚕️ Doctor loaded:', this.doctorName, 'ID:', this.currentUserId);
    }
  }

  loadConversations(): void {
    // Don't show loading spinner if we're just refreshing
    const isInitialLoad = this.conversations.length === 0;
    if (isInitialLoad) {
      this.isLoading = true;
    }

    this.messageService.getConversations().subscribe({
      next: (response) => {
        if (response.success && response.conversations) {
          console.log('📋 Conversations loaded:', response.conversations);
          
          this.conversations = response.conversations.map(conv => ({
            id: conv.connectionId,
            connectionId: conv.connectionId,
            participantId: conv.participantId,
            name: conv.participantName,
            role: conv.participantRole,
            lastMessage: conv.lastMessage || 'No messages yet',
            time: this.formatTime(conv.lastMessageTime),
            unread: conv.unreadCount,
            online: conv.online
          }));

          console.log('✅ Formatted conversations:', this.conversations);

          // Select first conversation if available and none selected yet
          if (this.conversations.length > 0 && !this.selectedConversation && isInitialLoad) {
            this.selectConversation(this.conversations[0]);
          }
        }
        if (isInitialLoad) {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('❌ Error loading conversations:', error);
        if (isInitialLoad) {
          this.isLoading = false;
        }
      }
    });
  }

  selectConversation(conversation: any): void {
    console.log('🔵 Selecting conversation:', conversation);
    this.selectedConversation = conversation;
    
    // Mark as read immediately in UI
    conversation.unread = 0;
    
    // Load messages for this conversation
    this.loadMessages(conversation.connectionId);
    
    // Mark messages as read on server
    this.messageService.markAsRead(conversation.connectionId).subscribe({
      next: () => console.log('✅ Messages marked as read'),
      error: (error) => console.error('❌ Error marking as read:', error)
    });
  }

  loadMessages(connectionId: string, scrollToBottom: boolean = true): void {
    console.log('📥 Loading messages for connection:', connectionId);
    
    this.messageService.getMessages(connectionId).subscribe({
      next: (response) => {
        if (response.success && response.messages) {
          console.log('✅ Messages loaded:', response.messages.length);
          
          const previousMessageCount = this.messages.length;
          
          this.messages = response.messages.map(msg => ({
            text: msg.content,
            time: this.formatTime(msg.createdAt),
            isDoctor: msg.sender === this.currentUserId,
            hasAttachment: msg.hasAttachment,
            attachmentName: msg.attachmentName,
            attachmentUrl: msg.attachmentUrl
          }));

          // Only scroll if it's initial load or new messages arrived
          if (scrollToBottom || this.messages.length > previousMessageCount) {
            this.shouldScrollToBottom = true;
          }
        }
      },
      error: (error) => {
        console.error('❌ Error loading messages:', error);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('File size exceeds 10MB limit. Please choose a smaller file.');
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Please upload PDF, JPG, PNG, DOC, or DOCX files.');
        return;
      }

      this.attachedFile = file;
      console.log('📎 File attached:', file.name);
    }
  }

  removeAttachment(): void {
    this.attachedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  onEnterPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    if ((!this.messageText.trim() && !this.attachedFile) || !this.selectedConversation) {
      console.warn('⚠️ Cannot send: missing message content or conversation');
      return;
    }

    const connectionId = this.selectedConversation.connectionId;
    const content = this.messageText.trim() || (this.attachedFile ? `Sent ${this.attachedFile.name}` : '');

    console.log('📤 Sending message:', { connectionId, content, hasAttachment: !!this.attachedFile });

    this.messageService.sendMessage(connectionId, content, this.attachedFile || undefined).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Message sent successfully');
          
          // Add message to local display immediately
          const now = new Date();
          const time = this.formatTime(now.toISOString());

          this.messages.push({
            text: content,
            time: time,
            isDoctor: true,
            hasAttachment: !!this.attachedFile,
            attachmentName: this.attachedFile?.name
          });

          // Update conversation list
          this.selectedConversation.lastMessage = content;
          this.selectedConversation.time = time;

          // Clear input
          this.messageText = '';
          this.attachedFile = null;
          if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
          }

          this.shouldScrollToBottom = true;
          
          // Reload conversations to update order
          this.loadConversations();
        }
      },
      error: (error) => {
        console.error('❌ Error sending message:', error);
        alert('Failed to send message. Please try again.');
      }
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      // Today - show time
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesArea) {
        const element = this.messagesArea.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('❌ Error scrolling to bottom:', err);
    }
  }

  get filteredConversations(): any[] {
    if (!this.searchQuery.trim()) {
      return this.conversations;
    }
    
    const query = this.searchQuery.toLowerCase();
    return this.conversations.filter(conv => 
      conv.name.toLowerCase().includes(query) ||
      conv.lastMessage.toLowerCase().includes(query)
    );
  }


}
