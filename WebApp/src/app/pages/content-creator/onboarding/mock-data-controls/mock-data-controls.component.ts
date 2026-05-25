
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mock-data-controls',
  imports: [FormsModule],
  templateUrl: './mock-data-controls.component.html',
  styleUrl: './mock-data-controls.component.scss'
})
export class MockDataControlsComponent implements OnInit, OnChanges {
  @Input() useMockData = false;
  @Input() isProduction = true;
  @Input() initialSubscribers = 800;
  @Input() initialViewers = 250;
  @Input() showVariationIndicator = false; // For revenue-results only
  @Input() currentVariation = ''; // For variation indicator
  
  @Output() mockDataToggled = new EventEmitter<boolean>();
  @Output() mockDataChanged = new EventEmitter<{subscribers: number, viewers: number}>();

  // Mock data slider values
  mockSubscribers = 800;
  mockViewers = 250;

  ngOnInit() {
    // Initialize mock values from inputs
    this.mockSubscribers = this.initialSubscribers;
    this.mockViewers = this.initialViewers;
    
    // Ensure initial values are valid
    this.validateViewersCount();
  }

  ngOnChanges() {
    // Update mock values when inputs change
    this.mockSubscribers = this.initialSubscribers;
    this.mockViewers = this.initialViewers;
    
    // Ensure updated values are valid
    this.validateViewersCount();
  }

  private validateViewersCount() {
    // Ensure viewers don't exceed subscribers
    if (this.mockViewers > this.mockSubscribers) {
      this.mockViewers = this.mockSubscribers;
    }
  }

  onMockDataToggle() {
    // Initialize mock values when toggling on
    if (this.useMockData) {
      this.mockSubscribers = this.initialSubscribers;
      this.mockViewers = this.initialViewers || 320;
      
      // Ensure the initialized values are valid
      this.validateViewersCount();
    }
    this.mockDataToggled.emit(this.useMockData);
  }

  onSliderChange() {
    // Auto-correct viewers if they exceed subscribers
    if (this.mockViewers > this.mockSubscribers) {
      this.mockViewers = this.mockSubscribers;
    }
    
    // Emit the new mock data values to the parent component
    this.mockDataChanged.emit({
      subscribers: this.mockSubscribers,
      viewers: this.mockViewers
    });
  }

  onSubscriberChange() {
    // When subscribers change, ensure viewers don't exceed the new limit
    if (this.mockViewers > this.mockSubscribers) {
      this.mockViewers = this.mockSubscribers;
    }
    this.onSliderChange();
  }

  getVariationDisplayText(): string {
    switch (this.currentVariation) {
      case 'qualified-with-viewers':
        return 'Qualified with viewers';
      case 'qualified-no-viewers':
        return 'Qualified without viewers';
      case 'not-qualified':
        return 'Not qualified (<250 subscribers)';
      default:
        return 'Payment access details with mock data';
    }
  }
}