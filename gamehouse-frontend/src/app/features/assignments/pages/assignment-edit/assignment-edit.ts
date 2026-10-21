import { Component, input } from '@angular/core';
import { AssignmentFormPage } from '../../components/assignment-form-page/assignment-form-page';
@Component({
  selector: 'app-assignment-edit',
  imports: [AssignmentFormPage],
  template: '<app-assignment-form-page [experienceId]="experienceId()" [categoryId]="categoryId()" />',
})
export class AssignmentEdit { readonly experienceId = input.required<string>();
  readonly categoryId = input.required<string>(); }
