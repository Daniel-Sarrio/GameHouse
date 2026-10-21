import { Component, input } from '@angular/core';
import { EventFormPage } from '../../components/event-form-page/event-form-page';
@Component({ selector: 'app-event-edit', imports: [EventFormPage], template: '<app-event-form-page [id]="id()" />' })
export class EventEdit { readonly id = input.required<string>(); }
