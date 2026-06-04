import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PublicContactService } from '../services/public-contact.service';
import { PublicShellComponent } from '../shared/public-shell.component';

interface StaticPageContent {
  title: string;
  lead: string;
  sections: { heading: string; paragraphs: string[] }[];
}

const STATIC_PAGES: Record<string, StaticPageContent> = {
  contact: {
    title: 'Contact',
    lead: 'Une question sur JobBoard ? Envoyez-nous un message via le formulaire ci-dessous.',
    sections: [],
  },
  terms: {
    title: 'Termes et conditions',
    lead: 'Conditions générales d’utilisation de la plateforme JobBoard.',
    sections: [
      {
        heading: '1. Objet',
        paragraphs: [
          'JobBoard met en relation candidats et recruteurs. L’inscription implique l’acceptation des présentes conditions.',
        ],
      },
      {
        heading: '2. Comptes utilisateurs',
        paragraphs: [
          'Chaque utilisateur est responsable de la confidentialité de ses identifiants et des informations publiées sur son profil.',
          'JobBoard se réserve le droit de suspendre un compte en cas de non-respect des règles ou de comportement abusif.',
        ],
      },
      {
        heading: '3. Données personnelles',
        paragraphs: [
          'Les données sont traitées conformément à la réglementation en vigueur (RGPD). Vous pouvez exercer vos droits en nous contactant.',
        ],
      },
      {
        heading: '4. Évolution du service',
        paragraphs: [
          'Les fonctionnalités peuvent évoluer. Les conditions peuvent être mises à jour ; la date de dernière révision sera indiquée sur cette page.',
        ],
      },
    ],
  },
  about: {
    title: 'Qui sommes-nous',
    lead: 'JobBoard simplifie le recrutement pour les candidats comme pour les entreprises.',
    sections: [
      {
        heading: 'Notre mission',
        paragraphs: [
          'Nous voulons rendre la recherche d’emploi et le recrutement plus transparents, plus rapides et plus humains.',
          'Candidats et recruteurs disposent d’un même espace : offres, candidatures, quiz de présélection et ATS intégré.',
        ],
      },
      {
        heading: 'Ce que nous proposons',
        paragraphs: [
          'Aux candidats : recherche d’offres, candidature guidée, alertes et suivi des dossiers.',
          'Aux recruteurs : page employeur, publication d’offres enrichies, quiz technique et pipeline de recrutement.',
        ],
      },
      {
        heading: 'Notre équipe',
        paragraphs: [
          'JobBoard est développé et maintenu par une équipe passionnée par l’emploi et la tech. Pour nous joindre, utilisez la page Contact.',
        ],
      },
    ],
  },
};

@Component({
  selector: 'app-public-static-page',
  standalone: true,
  imports: [PublicShellComponent, RouterLink, ReactiveFormsModule],
  templateUrl: './public-static-page.component.html',
  styleUrl: './public-static-page.component.css',
})
export class PublicStaticPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly contactService = inject(PublicContactService);

  readonly pageId = this.route.snapshot.data['pageId'] as string;
  readonly content = STATIC_PAGES[this.pageId] ?? STATIC_PAGES['contact'];
  readonly isContactPage = this.pageId === 'contact';

  readonly submitting = signal(false);
  readonly submitSuccess = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);

  readonly contactForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
  });

  fieldError(controlName: 'name' | 'email' | 'subject' | 'message'): string | null {
    const control = this.contactForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Ce champ est obligatoire.';
    }
    if (control.errors['email']) {
      return 'Adresse e-mail invalide.';
    }
    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return `Minimum ${min} caractères.`;
    }
    if (control.errors['maxlength']) {
      const max = control.errors['maxlength'].requiredLength;
      return `Maximum ${max} caractères.`;
    }
    return 'Valeur invalide.';
  }

  submitContact(): void {
    this.contactForm.markAllAsTouched();
    if (this.contactForm.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.submitSuccess.set(null);
    this.submitError.set(null);

    this.contactService
      .submit(this.contactForm.getRawValue())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          this.submitSuccess.set(res.message);
          this.contactForm.reset();
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.error?.errors?.[0]?.message ||
            'Impossible d’envoyer le message. Réessayez plus tard.';
          this.submitError.set(msg);
        },
      });
  }
}
