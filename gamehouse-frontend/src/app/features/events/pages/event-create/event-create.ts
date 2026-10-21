import { Component } from '@angular/core';
import { EventFormPage } from '../../components/event-form-page/event-form-page';
@Component({ selector: 'app-event-create', imports: [EventFormPage], template: '<app-event-form-page />' })
export class EventCreate {}
