import { Component, input } from '@angular/core';
import { ShopExperience } from '../../../../core/models/shop.model';
import { ExperienceCard } from '../experience-card/experience-card';

/** List + Card: la lista solo compone tarjetas; la página decide carga, errores y vacío. */
@Component({
  selector: 'app-experience-list',
  imports: [ExperienceCard],
  template: `
    <ul class="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 xl:grid-cols-3" aria-label="Experiencias">
      @for (experience of experiences(); track experience.id) {
        <li><app-experience-card [experience]="experience" /></li>
      }
    </ul>
  `,
})
export class ExperienceList {
  readonly experiences = input.required<ShopExperience[]>();
}
