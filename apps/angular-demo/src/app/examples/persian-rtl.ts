import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { CalendrixDatePicker } from '@calendrix/angular';
import type { SelectionValue } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';

@Component({
  selector: 'example-persian-rtl',
  imports: [JsonPipe, CalendrixDatePicker],
  template: `
    <calendrix-date-picker
      [(value)]="date"
      system="persian"
      locale="fa-IR"
      direction="rtl"
      [plugins]="plugins"
    />
    <pre>{{ date() | json }}</pre>
  `,
})
export class PersianRtlExample {
  protected readonly plugins = [persianPlugin];
  protected readonly date = signal<SelectionValue<'single'> | undefined>(undefined);
}