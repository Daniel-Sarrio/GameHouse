import { Component } from '@angular/core';
import { OrganizerFormPage } from '../../components/organizer-form-page/organizer-form-page';

@Component({ selector: 'app-organizer-create', imports: [OrganizerFormPage],
  template: '<app-organizer-form-page />' })
export class OrganizerCreate {}
