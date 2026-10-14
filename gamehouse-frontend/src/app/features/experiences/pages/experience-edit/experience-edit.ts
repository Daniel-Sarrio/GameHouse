import { Component, input } from '@angular/core';
import { EventoFormPage } from '../../components/experience-form-page/evento-form-page';

@Component({
  selector: 'app-experience-edit',
  imports: [EventoFormPage],
  template: '<app-evento-form-page [slug]="slug()" />',
})
export class ExperienceEdit {
  readonly slug = input.required<string>();
}
