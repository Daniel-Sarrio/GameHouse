import { Component } from '@angular/core';
import { EventoFormPage } from '../../components/experience-form-page/evento-form-page';

@Component({
  selector: 'app-experience-create',
  imports: [EventoFormPage],
  template: '<app-evento-form-page />',
})
export class ExperienceCreate {}
