import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicShellComponent } from '../shared/public-shell.component';
import { PublicCatalogService } from '../services/public-catalog.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { TRAINING_DELIVERY_OPTIONS } from '../shared/catalog.constants';

@Component({
  selector: 'app-training-center-publish',
  standalone: true,
  imports: [PublicShellComponent, RouterLink, FormsModule],
  templateUrl: './training-center-publish.component.html',
  styleUrl: '../shared/public-catalog.page.css',
})
export class TrainingCenterPublishComponent {
  private readonly catalog = inject(PublicCatalogService);
  private readonly router = inject(Router);

  readonly routes = APP_ROUTES;
  readonly deliveryOptions = TRAINING_DELIVERY_OPTIONS.filter((o) => o.value);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  name = '';
  logoUrl = '';
  description = '';
  address = '';
  city = '';
  phone = '';
  email = '';
  website = '';
  trainingDomain = '';
  deliveryMode = '';
  photoUrlsText = '';
  socialLinksText = '';
  courses: { title: string; description: string }[] = [{ title: '', description: '' }];

  addCourse(): void {
    this.courses = [...this.courses, { title: '', description: '' }];
  }

  removeCourse(index: number): void {
    if (this.courses.length <= 1) return;
    this.courses = this.courses.filter((_, i) => i !== index);
  }

  submit(): void {
    this.error.set(null);
    this.success.set(null);
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

    const courses = this.courses
      .filter((c) => c.title.trim())
      .map((c) => ({
        title: c.title.trim(),
        description: c.description.trim() || null,
        deliveryMode: this.deliveryMode || undefined,
      }));

    this.catalog
      .submitTrainingCenter({
        name: this.name.trim(),
        logoUrl: this.logoUrl.trim() || null,
        description: this.description.trim(),
        address: this.address.trim() || null,
        city: this.city.trim() || null,
        phone: this.phone.trim() || null,
        email: this.email.trim() || null,
        website: this.website.trim() || null,
        trainingDomain: this.trainingDomain.trim() || null,
        deliveryMode: this.deliveryMode || undefined,
        photoUrls,
        socialLinks,
        courses,
      })
      .subscribe({
        next: (res) => {
          this.success.set(res.data?.message ?? 'Demande envoyée.');
          this.submitting.set(false);
        },
        error: (err) => {
          const msg = err?.error?.message ?? 'Envoi impossible. Vérifiez les champs.';
          this.error.set(typeof msg === 'string' ? msg : 'Envoi impossible.');
          this.submitting.set(false);
        },
      });
  }
}
