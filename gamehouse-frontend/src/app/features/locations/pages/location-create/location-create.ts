import { Component } from '@angular/core';
import { LocationFormPage } from '../../components/location-form-page/location-form-page';
@Component({
  selector: 'app-location-create',
  imports: [LocationFormPage],
  template: '<app-location-form-page />',
})
export class LocationCreate {  }
