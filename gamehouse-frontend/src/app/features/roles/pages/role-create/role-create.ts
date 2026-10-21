import { Component } from '@angular/core';
import { RoleFormPage } from '../../components/role-form-page/role-form-page';

@Component({
  selector: 'app-role-create',
  imports: [RoleFormPage],
  template: '<app-role-form-page />',
})
export class RoleCreate {}
