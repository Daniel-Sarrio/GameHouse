import { Component, input } from '@angular/core';
import { CategoryFormPage } from '../../components/category-form-page/category-form-page';

@Component({ selector: 'app-category-edit', imports: [CategoryFormPage],
  template: '<app-category-form-page [slug]="slug()" />' })
export class CategoryEdit { readonly slug = input.required<string>(); }
