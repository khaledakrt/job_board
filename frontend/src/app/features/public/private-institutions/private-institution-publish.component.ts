import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicShellComponent } from '../shared/public-shell.component';
import { PublicCatalogService } from '../services/public-catalog.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { INSTITUTION_TYPE_OPTIONS } from '../shared/catalog.constants';
import { InstitutionType } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-private-institution-publish',
  standalone: true,
  imports: [PublicShellComponent, RouterLink, FormsModule],
  templateUrl: './private-institution-publish.component.html',
  styleUrl: '../shared/public-catalog.page.css',
})
export class PrivateInstitutionPublishComponent {
  private readonly catalog = inject(PublicCatalogService);

  readonly routes = APP_ROUTES;
  readonly typeOptions = INSTITUTION_TYPE_OPTIONS.filter((o) => o.value);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly confirmOpen = signal(false);

  name = '';
  institutionType: InstitutionType = 'high_school';
  logoUrl = '';
  description = '';
  address = '';
  city = '';
  phone = '';
  email = '';
  website = '';
  mapUrl = '';
  photoUrlsText = '';
  socialLinksText = '';
  programs: { title: string; description: string }[] = [{ title: '', description: '' }];

  addProgram(): void {
    this.programs = [...this.programs, { title: '', description: '' }];
  }

  removeProgram(index: number): void {
    if (this.programs.length <= 1) return;
    this.programs = this.programs.filter((_, i) => i !== index);
  }

  submit(): void {
    this.error.set(null);
    this.success.set(null);
    if (this.name.trim().length < 2) {
      this.error.set('Le nom de l’établissement est obligatoire.');
      return;
    }
    if (this.description.trim().length < 20) {
      this.error.set('La présentation doit contenir au moins 20 caractères.');
      return;
    }
    if (!this.programs.some((p) => p.title.trim())) {
      this.error.set('Ajoutez au moins un programme ou une filière.');
      return;
    }
    this.confirmOpen.set(true);
  }

  closeConfirm(): void {
    if (this.submitting()) return;
    this.confirmOpen.set(false);
  }

  confirmSubmit(): void {
    this.submitting.set(true);

    const photoUrls = this.photoUrlsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const socialLinks = this.socialLinksText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((url) => ({ url }));
    const programs = this.programs
      .filter((p) => p.title.trim())
      .map((p) => ({
        title: p.title.trim(),
        description: p.description.trim() || null,
      }));

    this.catalog
      .submitPrivateInstitution({
        name: this.name.trim(),
        institutionType: this.institutionType,
        logoUrl: this.logoUrl.trim() || null,
        description: this.description.trim(),
        address: this.address.trim() || null,
        city: this.city.trim() || null,
        phone: this.phone.trim() || null,
        email: this.email.trim() || null,
        website: this.website.trim() || null,
        mapUrl: this.mapUrl.trim() || null,
        photoUrls,
        socialLinks,
        programs,
      })
      .subscribe({
        next: (res) => {
          this.success.set(res.data?.message ?? 'Demande envoyée.');
          this.submitting.set(false);
          this.confirmOpen.set(false);
        },
        error: (err) => {
          const msg = err?.error?.message ?? 'Envoi impossible.';
          this.error.set(typeof msg === 'string' ? msg : 'Envoi impossible.');
          this.submitting.set(false);
          this.confirmOpen.set(false);
        },
      });
  }
}
