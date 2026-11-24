import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { CalendrixTimeField } from '@calendrix/angular';
import type { TimeValue } from '@calendrix/core';

@Component({
  selector: 'example-time-field',
  imports: [JsonPipe, CalendrixTimeField],
  template: `
    <calendrix-time-field [(value)]="time" />
    <pre>{{ time() | json }}</pre>
  `,
})
export class TimeFieldExample {
  protected readonly time = signal<TimeValue | null | undefined>(undefined);
}
