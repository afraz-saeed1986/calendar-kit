import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { CalendrixDatePicker } from '@calendrix/angular';
import type { SelectionValue } from '@calendrix/core';

@Component({
  selector: 'example-date-picker-multiple',
  imports: [JsonPipe, CalendrixDatePicker],
  template: `
    <calendrix-date-picker [selection]="'multiple'" [(value)]="dates" />
    @if (dates()?.length) {
      <pre>{{ dates() | json }}</pre>
    }
  `,
})
export class DatePickerMultipleExample {
  protected readonly dates = signal<SelectionValue<'multiple'> | undefined>(undefined);
}