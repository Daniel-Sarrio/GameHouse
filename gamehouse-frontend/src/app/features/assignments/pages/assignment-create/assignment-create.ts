import { Component } from '@angular/core';
import { AssignmentFormPage } from '../../components/assignment-form-page/assignment-form-page';
@Component({
  selector: 'app-assignment-create',
  imports: [AssignmentFormPage],
  template: '<app-assignment-form-page />',
})
export class AssignmentCreate {  }
