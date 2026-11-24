import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { CalendrixDatePicker } from '@calendrix/angular';
import type { SelectionValue } from '@calendrix/core';

@Component({
  selector: 'example-date-picker',
  imports: [JsonPipe, CalendrixDatePicker],
  template: `
    <calendrix-date-picker [(value)]="date" />
    <pre>{{ date() | json }}</pre>
  `,
})
export class DatePickerExample {
  protected readonly date = signal<SelectionValue<'single'> | undefined>(undefined);
}
