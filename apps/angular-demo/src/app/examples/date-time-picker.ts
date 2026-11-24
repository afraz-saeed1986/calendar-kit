import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { CalendrixDateTimePicker } from '@calendrix/angular';
import type { DateTimeValue } from '@calendrix/core';

@Component({
  selector: 'example-date-time-picker',
  imports: [JsonPipe, CalendrixDateTimePicker],
  template: `
    <calendrix-date-time-picker [(value)]="value" />
    @if (value()) {
      <pre>{{ value() | json }}</pre>
    }
  `,
})
export class DateTimePickerExample {
  protected readonly value = signal<DateTimeValue | null | undefined>(undefined);
}
