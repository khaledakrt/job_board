import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PublicContactService } from '../services/public-contact.service';
import { PublicShellComponent } from '../shared/public-shell.component';
import { AppLanguage } from '../../../core/i18n/translations';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface StaticPageContent {
  title: string;
  lead: string;
  sections: { heading: string; paragraphs: string[] }[];
}

const STATIC_PAGES_FR: Record<string, StaticPageContent> = {
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

const STATIC_PAGES_EN: Record<string, StaticPageContent> = {
  contact: {
    title: 'Contact',
    lead: 'Have a question about JobBoard? Send us a message using the form below.',
    sections: [],
  },
  terms: {
    title: 'Terms and conditions',
    lead: 'General terms of use for Tun Job Board, a platform dedicated to connecting talent, recruiters, training centers and institutions.',
    sections: [
      {
        heading: '1. Purpose',
        paragraphs: [
          'Tun Job Board provides a digital space designed to simplify job search, job posting, application tracking, training discovery and connections with professional stakeholders.',
          'Accessing the platform, creating an account or using its services implies full acceptance of these general terms of use.',
        ],
      },
      {
        heading: '2. Platform access and user accounts',
        paragraphs: [
          'Some services are freely accessible, including public page browsing. Other features require creating a candidate, recruiter, administrator or catalog provider account depending on the user profile.',
          'Each user agrees to provide accurate, complete and up-to-date information. Users remain responsible for the confidentiality of their credentials, the activity carried out from their account and the information published on the platform.',
          'Tun Job Board may suspend or restrict access to an account in case of abusive use, attempted fraud, misleading content publication or breach of these terms.',
        ],
      },
      {
        heading: '3. Candidate obligations',
        paragraphs: [
          'Candidates agree to publish a profile that faithfully reflects their background, skills and experience. Resumes, contact information, preferences and applications must only be used in a professional context.',
          'Any application sent through the platform must correspond to a genuine intent to apply. Automated, repetitive behavior or attempts to disrupt the normal operation of the service are prohibited.',
        ],
      },
      {
        heading: '4. Recruiter and organization obligations',
        paragraphs: [
          'Recruiters, training centers and private institutions agree to publish accurate, lawful and sufficiently detailed information. Jobs, training programs, events or announcements must not contain discriminatory, misleading, fraudulent or unlawful content.',
          'Information obtained through the platform, including applications and candidate contact details, must only be used for the intended professional purposes and with respect for confidentiality.',
        ],
      },
      {
        heading: '5. Personal data and confidentiality',
        paragraphs: [
          'Tun Job Board collects and processes the data required to operate the service: account management, profiles, applications, communications, security and user experience improvement.',
          'Users may request access, correction or deletion of their data by contacting the team at contact@tun-job-board.com. Sensitive data such as resumes and application documents are protected by authenticated access when necessary.',
        ],
      },
      {
        heading: '6. Availability, security and service evolution',
        paragraphs: [
          'Tun Job Board makes reasonable efforts to ensure platform availability, security and performance. Temporary interruptions may occur for maintenance, updates or technical incidents.',
          'Features, interfaces and operating rules may evolve to improve the service, strengthen security or meet user needs.',
        ],
      },
      {
        heading: '7. Liability',
        paragraphs: [
          'Tun Job Board acts as a connection and tooling platform. Decisions to recruit, apply, contact a profile or enter into a collaboration are solely the responsibility of the users concerned.',
          'The platform does not guarantee obtaining a job, recruitment, registration or partnership. Each user remains responsible for their exchanges, decisions and professional commitments.',
        ],
      },
      {
        heading: '8. Contact and reporting',
        paragraphs: [
          'For any question about these terms, administrative request or report of problematic content, users may contact the team through the Contact page or by email at administration@tun-job-board.com.',
          'Last update: June 2026.',
        ],
      },
    ],
  },
  about: {
    title: 'About us',
    lead: 'Tun Job Board is a Tunisian platform designed to bring talent, recruiters and training stakeholders together through a simple, reliable and professional experience.',
    sections: [
      {
        heading: 'Our mission',
        paragraphs: [
          'Our mission is to make access to professional opportunities clearer, faster and fairer. We want to give candidates a structured space to showcase their skills, track applications and discover relevant opportunities.',
          'We also support recruiters with concrete tools to publish jobs, organize applications, preselect profiles and manage their recruitment process more efficiently.',
        ],
      },
      {
        heading: 'A platform for the Tunisian ecosystem',
        paragraphs: [
          'Tun Job Board is built for candidates, companies, recruitment agencies, training centers and private institutions. The platform centralizes jobs, applications, training programs, events and useful publications for professional growth.',
          'Our goal is to create a reliable meeting point between market needs, available skills and training paths that help people progress.',
        ],
      },
      {
        heading: 'What we offer candidates',
        paragraphs: [
          'Candidates can create a profile, add a resume, search jobs, apply, save opportunities and track application progress from a dedicated dashboard.',
          'The platform focuses on a clear candidate journey: transparent information, alerts, status tracking and access to useful training or guidance content.',
        ],
      },
      {
        heading: 'What we offer recruiters',
        paragraphs: [
          'Recruiters get a professional workspace to present their company, publish rich job posts, manage applications, collaborate with their team and structure their recruitment pipeline.',
          'Features such as prescreening quizzes, internal notes, application statuses and notifications save time while improving follow-up quality.',
        ],
      },
      {
        heading: 'Training, institutions and guidance',
        paragraphs: [
          'Tun Job Board also includes training centers and private institutions to increase visibility for programs, courses, events, open days and important announcements.',
          'This dimension connects employment, skills development and guidance, three essential elements for supporting employability and professional growth.',
        ],
      },
      {
        heading: 'Our commitments',
        paragraphs: [
          'We prioritize a simple, secure and professional experience. Sensitive information such as resumes and application data is handled carefully and protected by appropriate access rules.',
          'We continuously improve the platform to provide a faster, clearer and more useful service while keeping a human approach to recruitment.',
        ],
      },
      {
        heading: 'Contact us',
        paragraphs: [
          'For a question, professional request, partnership or improvement suggestion, you can write to us through the Contact page or at contact@tun-job-board.com.',
        ],
      },
    ],
  },
};

const STATIC_PAGES: Record<AppLanguage, Record<string, StaticPageContent>> = {
  fr: STATIC_PAGES_FR,
  en: STATIC_PAGES_EN,
};

@Component({
  selector: 'app-public-static-page',
  standalone: true,
  imports: [PublicShellComponent, RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './public-static-page.component.html',
  styleUrl: './public-static-page.component.css',
})
export class PublicStaticPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly contactService = inject(PublicContactService);
  private readonly i18n = inject(I18nService);

  readonly contactEmail = 'contact@tun-job-board.com';
  readonly pageId = this.route.snapshot.data['pageId'] as string;
  readonly content = computed(() => {
    const pages = STATIC_PAGES[this.i18n.language()];
    return pages[this.pageId] ?? pages['contact'];
  });
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
      return this.i18n.translate('static.contact.error.required');
    }
    if (control.errors['email']) {
      return this.i18n.translate('static.contact.error.email');
    }
    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return `${this.i18n.translate('static.contact.error.minimum')} ${min} ${this.i18n.translate('static.contact.error.characters')}.`;
    }
    if (control.errors['maxlength']) {
      const max = control.errors['maxlength'].requiredLength;
      return `${this.i18n.translate('static.contact.error.maximum')} ${max} ${this.i18n.translate('static.contact.error.characters')}.`;
    }
    return this.i18n.translate('static.contact.error.invalid');
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
            this.i18n.translate('static.contact.submitError');
          this.submitError.set(msg);
        },
      });
  }
}
