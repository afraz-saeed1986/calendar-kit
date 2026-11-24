import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { CalendrixDatePicker } from '@calendrix/angular';
import type { SelectionValue } from '@calendrix/core';

@Component({
  selector: 'example-date-picker-range',
  imports: [JsonPipe, CalendrixDatePicker],
  template: `
    <calendrix-date-picker [selection]="'range'" [(value)]="range" />
    @if (range()) {
      <pre>{{ range() | json }}</pre>
    }
  `,
})
export class DatePickerRangeExample {
  protected readonly range = signal<SelectionValue<'range'> | undefined>(undefined);
}
