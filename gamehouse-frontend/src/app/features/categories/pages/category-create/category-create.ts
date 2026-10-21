import { Component } from '@angular/core';
import { CategoryFormPage } from '../../components/category-form-page/category-form-page';

@Component({ selector: 'app-category-create', imports: [CategoryFormPage],
  template: '<app-category-form-page />' })
export class CategoryCreate {}
