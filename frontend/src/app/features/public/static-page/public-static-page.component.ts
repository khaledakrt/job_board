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
    lead: 'Conditions générales d’utilisation de Tun Job Board, plateforme dédiée à la mise en relation entre talents, recruteurs, centres de formation et établissements.',
    sections: [
      {
        heading: '1. Objet',
        paragraphs: [
          'Tun Job Board propose un espace numérique destiné à faciliter la recherche d’emploi, la publication d’offres, le suivi des candidatures, la découverte de formations et la mise en relation avec des acteurs professionnels.',
          'L’accès à la plateforme, la création d’un compte ou l’utilisation de ses services impliquent l’acceptation pleine et entière des présentes conditions générales d’utilisation.',
        ],
      },
      {
        heading: '2. Accès à la plateforme et comptes utilisateurs',
        paragraphs: [
          'Certains services sont accessibles librement, notamment la consultation de pages publiques. D’autres fonctionnalités nécessitent la création d’un compte candidat, recruteur, administrateur ou fournisseur de catalogue selon le profil de l’utilisateur.',
          'Chaque utilisateur s’engage à fournir des informations exactes, complètes et à jour. Il demeure responsable de la confidentialité de ses identifiants, de l’activité réalisée depuis son compte et des informations publiées sur la plateforme.',
          'Tun Job Board peut suspendre ou restreindre l’accès à un compte en cas d’utilisation abusive, de tentative de fraude, de publication de contenu trompeur ou de non-respect des présentes conditions.',
        ],
      },
      {
        heading: '3. Obligations des candidats',
        paragraphs: [
          'Les candidats s’engagent à publier un profil fidèle à leur parcours, leurs compétences et leurs expériences. Les CV, informations de contact, préférences et candidatures doivent être utilisés uniquement dans un cadre professionnel.',
          'Toute candidature envoyée via la plateforme doit correspondre à une intention réelle de postuler. Les comportements automatisés, répétitifs ou visant à détourner le fonctionnement normal du service sont interdits.',
        ],
      },
      {
        heading: '4. Obligations des recruteurs et organismes',
        paragraphs: [
          'Les recruteurs, centres de formation et établissements privés s’engagent à publier des informations exactes, licites et suffisamment détaillées. Les offres, formations, événements ou annonces ne doivent pas contenir de contenu discriminatoire, mensonger, frauduleux ou contraire à la réglementation applicable.',
          'Les informations obtenues via la plateforme, notamment les candidatures et coordonnées de candidats, doivent être utilisées uniquement pour les finalités professionnelles prévues et dans le respect de la confidentialité.',
        ],
      },
      {
        heading: '5. Données personnelles et confidentialité',
        paragraphs: [
          'Tun Job Board collecte et traite les données nécessaires au fonctionnement du service : gestion des comptes, profils, candidatures, communications, sécurité et amélioration de l’expérience utilisateur.',
          'Les utilisateurs peuvent demander l’accès, la rectification ou la suppression de leurs données en contactant l’équipe à l’adresse contact@tun-job-board.com. Les données sensibles comme les CV et documents de candidature sont protégées par des accès authentifiés lorsque cela est nécessaire.',
        ],
      },
      {
        heading: '6. Disponibilité, sécurité et évolution du service',
        paragraphs: [
          'Tun Job Board met en œuvre des moyens raisonnables pour assurer la disponibilité, la sécurité et la performance de la plateforme. Des interruptions temporaires peuvent toutefois intervenir pour maintenance, mise à jour ou incident technique.',
          'Les fonctionnalités, interfaces et règles de fonctionnement peuvent évoluer afin d’améliorer le service, renforcer la sécurité ou répondre aux besoins des utilisateurs.',
        ],
      },
      {
        heading: '7. Responsabilité',
        paragraphs: [
          'Tun Job Board agit comme plateforme de mise en relation et d’outillage. La décision de recruter, de postuler, de contacter un profil ou de conclure une collaboration relève exclusivement des utilisateurs concernés.',
          'La plateforme ne garantit pas l’obtention d’un emploi, d’un recrutement, d’une inscription ou d’un partenariat. Chaque utilisateur reste responsable de ses échanges, décisions et engagements professionnels.',
        ],
      },
      {
        heading: '8. Contact et signalement',
        paragraphs: [
          'Pour toute question relative aux présentes conditions, une demande administrative ou le signalement d’un contenu problématique, les utilisateurs peuvent contacter l’équipe via la page Contact ou par e-mail à administration@tun-job-board.com.',
          'Dernière mise à jour : juin 2026.',
        ],
      },
    ],
  },
  about: {
    title: 'Qui sommes-nous',
    lead: 'Tun Job Board est une plateforme tunisienne pensée pour rapprocher les talents, les recruteurs et les acteurs de la formation autour d’un parcours simple, fiable et professionnel.',
    sections: [
      {
        heading: 'Notre mission',
        paragraphs: [
          'Notre mission est de rendre l’accès aux opportunités professionnelles plus clair, plus rapide et plus équitable. Nous voulons offrir aux candidats un espace structuré pour valoriser leurs compétences, suivre leurs candidatures et découvrir des opportunités pertinentes.',
          'Nous accompagnons également les recruteurs avec des outils concrets pour publier des offres, organiser les candidatures, présélectionner les profils et piloter leur processus de recrutement avec plus d’efficacité.',
        ],
      },
      {
        heading: 'Une plateforme pour l’écosystème tunisien',
        paragraphs: [
          'Tun Job Board s’adresse aux candidats, aux entreprises, aux cabinets de recrutement, aux centres de formation et aux établissements privés. La plateforme centralise les offres d’emploi, les candidatures, les formations, les événements et les publications utiles à l’évolution professionnelle.',
          'Notre objectif est de créer un point de rencontre fiable entre les besoins du marché, les compétences disponibles et les parcours de formation qui permettent de progresser.',
        ],
      },
      {
        heading: 'Ce que nous apportons aux candidats',
        paragraphs: [
          'Les candidats peuvent créer leur profil, ajouter leur CV, rechercher des offres, postuler, sauvegarder des opportunités et suivre l’évolution de leurs candidatures depuis un tableau de bord dédié.',
          'La plateforme met l’accent sur la lisibilité du parcours candidat : informations claires, alertes, suivi des statuts et accès à des contenus de formation ou d’orientation utiles.',
        ],
      },
      {
        heading: 'Ce que nous apportons aux recruteurs',
        paragraphs: [
          'Les recruteurs disposent d’un espace professionnel pour présenter leur entreprise, publier des offres enrichies, gérer les candidatures, collaborer avec leur équipe et structurer leur pipeline de recrutement.',
          'Des fonctionnalités comme les quiz de présélection, les notes internes, les statuts de candidature et les notifications permettent de gagner du temps tout en améliorant la qualité du suivi.',
        ],
      },
      {
        heading: 'Formation, établissements et orientation',
        paragraphs: [
          'Tun Job Board intègre aussi les centres de formation et établissements privés afin de donner plus de visibilité aux programmes, formations, événements, journées portes ouvertes et annonces importantes.',
          'Cette dimension permet de relier l’emploi, la montée en compétences et l’orientation, trois éléments essentiels pour soutenir l’employabilité et la croissance professionnelle.',
        ],
      },
      {
        heading: 'Nos engagements',
        paragraphs: [
          'Nous privilégions une expérience simple, sécurisée et professionnelle. Les informations sensibles, comme les CV et les données de candidature, sont traitées avec attention et protégées par des règles d’accès adaptées.',
          'Nous améliorons continuellement la plateforme pour offrir un service plus rapide, plus clair et plus utile aux utilisateurs, tout en gardant une approche humaine du recrutement.',
        ],
      },
      {
        heading: 'Nous contacter',
        paragraphs: [
          'Pour une question, une demande professionnelle, un partenariat ou une suggestion d’amélioration, vous pouvez nous écrire via la page Contact ou à l’adresse contact@tun-job-board.com.',
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

  readonly contactEmail = 'contact@tun-job-board.com';
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
