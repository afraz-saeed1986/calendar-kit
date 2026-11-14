import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  CalendrixCalendar,
  CalendrixDatePicker,
  CalendrixDateTimePicker,
  CalendrixTimeField,
} from '@calendrix/angular';
import type { DateTimeValue, SelectionValue, TimeValue } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';

@Component({
  selector: 'app-root',
  imports: [
    JsonPipe,
    CalendrixCalendar,
    CalendrixDatePicker,
    CalendrixDateTimePicker,
    CalendrixTimeField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly plugins = [persianPlugin];

  protected readonly calendar = signal<SelectionValue<'single'> | undefined>(undefined);
  protected readonly time = signal<TimeValue | null | undefined>(undefined);
  protected readonly single = signal<SelectionValue<'single'> | undefined>(undefined);
  protected readonly range = signal<SelectionValue<'range'> | undefined>(undefined);
  protected readonly many = signal<SelectionValue<'multiple'> | undefined>(undefined);
  protected readonly dateTime = signal<DateTimeValue | null | undefined>(undefined);

  protected readonly faSingle = signal<SelectionValue<'single'> | undefined>(undefined);
  protected readonly faRange = signal<SelectionValue<'range'> | undefined>(undefined);
  protected readonly faDateTime = signal<DateTimeValue | null | undefined>(undefined);
}
