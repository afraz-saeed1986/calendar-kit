import { NgComponentOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { examples } from './examples';

// The documentation site shows one example in an iframe, chosen by the hash: #date-picker
@Component({
  selector: 'app-root',
  imports: [NgComponentOutlet],
  template: `
    <main style="padding: 16px">
      @if (example) {
        <ng-container *ngComponentOutlet="example" />
      } @else {
        <h1>calendrix for Angular</h1>
        <ul>
          @for (id of ids; track id) {
            <li>
              <a [href]="'#' + id">{{ id }}</a>
            </li>
          }
        </ul>
      }
    </main>
  `,
})
export class App {
  protected readonly ids = Object.keys(examples);
  protected readonly example = examples[window.location.hash.slice(1)];

  constructor() {
    window.addEventListener('hashchange', () => window.location.reload());
  }
}