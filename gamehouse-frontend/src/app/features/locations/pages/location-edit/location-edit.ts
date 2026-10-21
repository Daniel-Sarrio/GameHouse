import { Component, input } from '@angular/core';
import { LocationFormPage } from '../../components/location-form-page/location-form-page';
@Component({
  selector: 'app-location-edit',
  imports: [LocationFormPage],
  template: '<app-location-form-page [id]="id()" />',
})
export class LocationEdit { readonly id = input.required<string>(); }
