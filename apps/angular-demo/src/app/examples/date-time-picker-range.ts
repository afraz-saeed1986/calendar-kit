import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { CalendrixDateTimePicker } from '@calendrix/angular';
import type { DateTimeRange } from '@calendrix/core';

@Component({
  selector: 'example-date-time-picker-range',
  imports: [JsonPipe, CalendrixDateTimePicker],
  template: `
    <calendrix-date-time-picker [selection]="'range'" [(value)]="range" />
    <pre>{{ range() | json }}</pre>
  `,
})
export class DateTimePickerRangeExample {
  protected readonly range = signal<DateTimeRange | null | undefined>(undefined);
}
