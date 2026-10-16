import { Component, OnInit, inject, input, output } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, ValidationErrors, Validators, NonNullableFormBuilder } from '@angular/forms';
import { DatosEvento, Evento } from '../../../../core/models/experience.model';
import { EventosService, OpcionesEvento } from '../../../../core/services/experience.service';

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validUrl(control: AbstractControl): ValidationErrors | null {
  return !control.value || isHttpUrl(String(control.value)) ? null : { url: true };
}

function galleryUrls(control: AbstractControl): ValidationErrors | null {
  const urls = String(control.value || '').split(/[\n,]/).map((url) => url.trim()).filter(Boolean);
  return urls.every(isHttpUrl) ? null : { galleryUrl: true };
}

function nonBlank(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { blank: true };
}

function positiveInteger(control: AbstractControl): ValidationErrors | null {
  return Number.isSafeInteger(Number(control.value)) && Number(control.value) > 0 ? null : { positiveInteger: true };
}

@Component({
  selector: 'app-evento-form',
  imports: [ReactiveFormsModule],
  templateUrl: './evento-form.html',
  styleUrl: './evento-form.css',
})
export class EventoForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly eventosService = inject(EventosService);
  opciones: OpcionesEvento = { hosts: [], locations: [], categories: [] };
  errorOpciones: string | null = null;
  readonly evento = input<Evento | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosEvento>();
  readonly cancelar = output<void>();

  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, nonBlank, Validators.minLength(5), Validators.maxLength(120)]),
    description: this.fb.control('', [Validators.required, nonBlank, Validators.minLength(20), Validators.maxLength(2000)]),
    location: this.fb.control('', [Validators.required, nonBlank, Validators.minLength(2), Validators.maxLength(150)]),
    locationId: this.fb.control(0, [Validators.min(1)]),
    country: this.fb.control('España', [Validators.required, nonBlank, Validators.minLength(2), Validators.maxLength(100)]),
    city: this.fb.control('Valencia', [Validators.required, nonBlank, Validators.minLength(2), Validators.maxLength(100)]),
    price: this.fb.control(0, [Validators.required, Validators.min(0)]),
    currency: this.fb.control('EUR', [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)]),
    duration: this.fb.control(60, [positiveInteger]),
    capacity: this.fb.control(1, [positiveInteger]),
    coverImage: this.fb.control('', [Validators.required, validUrl]),
    gallery: this.fb.control('', [galleryUrls]),
    hostName: this.fb.control('', [Validators.required, nonBlank, Validators.minLength(2), Validators.maxLength(100)]),
    hostId: this.fb.control(0, [Validators.min(1)]),
    categoryIds: this.fb.control<number[]>([], [Validators.required, Validators.minLength(1)]),
    status: this.fb.control<Evento['status']>('published', [Validators.required]),
    isActive: this.fb.control(true),
  });

  ngOnInit(): void {
    void this.cargarOpciones();
    const evento = this.evento();
    if (evento) this.form.setValue({
      name: evento.name,
      description: evento.description || '',
      location: evento.location,
      locationId: evento.locationId,
      country: evento.country,
      city: evento.city,
      price: evento.price,
      currency: evento.currency,
      duration: evento.duration,
      capacity: evento.capacity,
      coverImage: evento.coverImage,
      gallery: evento.gallery.join('\n'),
      hostName: evento.hostName,
      hostId: evento.hostId,
      categoryIds: evento.categoryIds,
      status: evento.status,
      isActive: evento.isActive,
    });
  }

  async cargarOpciones(): Promise<void> {
    try { this.opciones = await this.eventosService.obtenerOpcionesFormulario(); this.errorOpciones = null; }
    catch { this.errorOpciones = 'No se pudieron cargar organizadores, lugares y categorías.'; }
  }

  seleccionarLugar(): void {
    const lugar = this.opciones.locations.find((item) => item.id === Number(this.form.controls.locationId.value));
    this.form.patchValue({ location: lugar?.name ?? '', city: lugar?.city ?? '', country: lugar?.country ?? '' });
  }

  seleccionarOrganizador(): void {
    const host = this.opciones.hosts.find((item) => item.id === Number(this.form.controls.hostId.value));
    this.form.controls.hostName.setValue(host?.name ?? '');
  }

  cambiarCategoria(id: number, checked: boolean): void {
    const ids = this.form.controls.categoryIds.value;
    this.form.controls.categoryIds.setValue(checked ? [...ids, id] : ids.filter((value) => value !== id));
    this.form.controls.categoryIds.markAsTouched();
  }

  categoriaSeleccionada(id: number): boolean { return this.form.controls.categoryIds.value.includes(id); }

  error(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (!control.invalid || !(control.dirty || control.touched)) return null;
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('blank')) return 'Este campo no puede contener solo espacios.';
    if (control.hasError('minlength')) return 'El texto es demasiado corto.';
    if (control.hasError('maxlength')) return 'El texto es demasiado largo.';
    if (control.hasError('min')) return 'Introduce un número igual o mayor que cero.';
    if (control.hasError('pattern')) return 'Introduce una moneda de tres letras (por ejemplo, EUR).';
    if (control.hasError('positiveInteger')) return 'Introduce un número entero mayor que cero.';
    if (control.hasError('url') || control.hasError('galleryUrl')) return 'Introduce una URL http o https válida.';
    return 'Revisa este campo.';
  }

  onSubmit(): void {
    if (this.errorOpciones) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const gallery = value.gallery.split(/[\n,]/).map((url) => url.trim()).filter(Boolean);
    this.guardar.emit({
      ...value,
      name: value.name.trim(),
      description: value.description.trim(),
      location: value.location.trim(),
      country: value.country.trim(),
      city: value.city.trim(),
      currency: value.currency.trim().toUpperCase(),
      coverImage: value.coverImage.trim(),
      gallery,
      hostName: value.hostName.trim(),
    });
  }
}
