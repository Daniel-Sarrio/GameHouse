import { Component, input } from '@angular/core';
import { OrganizerFormPage } from '../../components/organizer-form-page/organizer-form-page';

@Component({ selector: 'app-organizer-edit', imports: [OrganizerFormPage],
  template: '<app-organizer-form-page [slug]="slug()" />' })
export class OrganizerEdit { readonly slug = input.required<string>(); }
