import { Component, input } from '@angular/core';
import { EventoFormPage } from '../../components/experience-form-page/evento-form-page';

@Component({
  selector: 'app-experience-edit',
  imports: [EventoFormPage],
  template: '<app-evento-form-page [id]="id()" />',
})
export class ExperienceEdit {
  readonly id = input.required<string>();
}
