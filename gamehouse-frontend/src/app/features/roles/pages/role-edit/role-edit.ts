import { Component, input } from '@angular/core';
import { RoleFormPage } from '../../components/role-form-page/role-form-page';

@Component({
  selector: 'app-role-edit',
  imports: [RoleFormPage],
  template: '<app-role-form-page [id]="id()" />',
})
export class RoleEdit { readonly id = input.required<string>(); }
