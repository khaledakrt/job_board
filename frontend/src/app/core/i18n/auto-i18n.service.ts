import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { I18nService } from './i18n.service';

const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'placeholder', 'title'] as const;

const STATIC_TEXT_TRANSLATIONS: Record<string, string> = {
  'Chargement...': 'Loading...',
  'Chargement…': 'Loading...',
  'Enregistrement…': 'Saving...',
  'Envoi…': 'Sending...',
  'Annuler': 'Cancel',
  'Confirmer': 'Confirm',
  'Enregistrer': 'Save',
  'Modifier': 'Edit',
  'Supprimer': 'Delete',
  'Ajouter': 'Add',
  'Créer': 'Create',
  'Publier': 'Publish',
  'Masquer': 'Hide',
  'Archiver': 'Archive',
  'Restaurer': 'Restore',
  'Rechercher': 'Search',
  'Réinitialiser': 'Reset',
  'Précédent': 'Previous',
  'Suivant': 'Next',
  'Retour': 'Back',
  'Fermer': 'Close',
  'Voir': 'View',
  'Détail': 'Details',
  'Actions': 'Actions',
  'Pagination': 'Pagination',
  'Accueil': 'Home',
  'Connexion': 'Login',
  'Inscription': 'Registration',
  'Déconnexion': 'Logout',
  'Paramètres': 'Settings',
  'Profil': 'Profile',
  'Profil candidat': 'Candidate profile',
  'Profil entreprise': 'Company profile',
  'Profil incomplet': 'Incomplete profile',
  'Profil à compléter': 'Profile to complete',
  'Profil & documents': 'Profile & documents',
  'Fiche publique': 'Public profile',
  'Modifier infos personnelles': 'Edit personal information',
  'Compte de connexion': 'Login account',
  'Tableau de bord': 'Dashboard',
  'Tableau de bord recruteur': 'Recruiter dashboard',
  'Votre espace recrutement': 'Your recruiting workspace',
  'Offres': 'Jobs',
  "Offres d'emploi": 'Jobs',
  'Offre': 'Job',
  'Offres enregistrées': 'Saved jobs',
  'Offres enregistrées & alertes': 'Saved jobs & alerts',
  'Offre enregistrée': 'Saved job',
  'Aucune offre': 'No jobs',
  'Aucune offre enregistrée.': 'No saved jobs.',
  'Candidatures': 'Applications',
  'Candidature': 'Application',
  'Mes candidatures': 'My applications',
  'Candidatures actives': 'Active applications',
  'Aucune candidature.': 'No applications.',
  'Candidat': 'Candidate',
  'Candidats': 'Candidates',
  'Entreprise': 'Company',
  'Société': 'Company',
  'Équipe': 'Team',
  'Gérer l’équipe': 'Manage team',
  'Inviter': 'Invite',
  'Permissions': 'Permissions',
  'Nom': 'Name',
  'Prénom': 'First name',
  'E-mail': 'Email',
  'Email': 'Email',
  'Téléphone': 'Phone',
  'Ville': 'City',
  'Adresse': 'Address',
  'Site web': 'Website',
  'Description': 'Description',
  'Présentation': 'Presentation',
  'Titre': 'Title',
  'Statut': 'Status',
  'Progression': 'Progress',
  'Mise à jour': 'Updated',
  'Contrat': 'Contract',
  'Salaire': 'Salary',
  'Lieu': 'Location',
  'Localisation': 'Location',
  'Expérience': 'Experience',
  'Secteur': 'Industry',
  'Mots-clés': 'Keywords',
  'Formation': 'Training',
  'Formations': 'Training programs',
  'Événement': 'Event',
  'Événements': 'Events',
  'Programmes': 'Programs',
  'Publication': 'Publication',
  'Publications': 'Publications',
  'Publications validées': 'Approved publications',
  'Publications en attente': 'Pending publications',
  'Envoyés en validation': 'Sent for review',
  'En validation': 'Under review',
  'Brouillon': 'Draft',
  'Brouillon(s)': 'Draft(s)',
  'En attente': 'Pending',
  'Actif': 'Active',
  'Active': 'Active',
  'À compléter': 'To complete',
  'Validé': 'Approved',
  'Validée': 'Approved',
  'Refusé': 'Rejected',
  'Refusée': 'Rejected',
  'Archivé': 'Archived',
  'Archivées': 'Archived',
  'Interne': 'Internal',
  'Visible candidats': 'Visible to candidates',
  'Vues': 'Views',
  'Vues totales': 'Total views',
  'Offres totales': 'Total jobs',
  'Conversion': 'Conversion',
  'Volume pipeline': 'Pipeline volume',
  'Candidatures / vues': 'Applications / views',
  'Créer une offre': 'Create a job',
  'Publier une formation': 'Publish a training program',
  'Modifier la formation': 'Edit training program',
  'Publier un événement': 'Publish an event',
  'Modifier l’événement': 'Edit event',
  'Envoyer en validation': 'Submit for review',
  'Enregistrer le brouillon': 'Save draft',
  'Informations générales': 'General information',
  'Informations': 'Information',
  'Description détaillée': 'Detailed description',
  'Contact & médias': 'Contact & media',
  'Coordonnées et identité': 'Contact and identity',
  'Type de publication': 'Publication type',
  'Type d’événement': 'Event type',
  'Type d’établissement': 'Institution type',
  'Nom du centre': 'Center name',
  "Nom de l’établissement": 'Institution name',
  'Nom de votre centre': 'Name of your center',
  'Nom de votre établissement': 'Name of your institution',
  'Domaine de formation': 'Training domain',
  'Brochure PDF': 'PDF brochure',
  'Importer le logo': 'Upload logo',
  'Importer une brochure': 'Upload brochure',
  'Image principale': 'Main image',
  'Galerie': 'Gallery',
  'Galerie photos': 'Photo gallery',
  'Affiche / image': 'Poster / image',
  'Participants': 'Participants',
  'Contacts candidats': 'Candidate contacts',
  'Voir tous les participants': 'View all participants',
  'Voir tous les inscrits': 'View all registrants',
  'Aucun inscrit pour le moment.': 'No registrants yet.',
  'Aucune formation en attente de validation.': 'No training program pending review.',
  'Aucune alerte. Créez-en une depuis la recherche d’offres.': 'No alerts. Create one from job search.',
  'Aucune alerte. Créez-en une depuis la recherche d\'offres.': 'No alerts. Create one from job search.',
  'Alerte active': 'Active alert',
  'Alerte recherche': 'Search alert',
  'Alerte emploi': 'Job alert',
  'En pause': 'Paused',
  'Critères larges': 'Broad criteria',
  'Créer une alerte': 'Create an alert',
  'Fréquence': 'Frequency',
  'Nom de l’alerte': 'Alert name',
  "Nom de l'alerte": 'Alert name',
  'Hebdomadaire - chaque dimanche': 'Weekly - every Sunday',
  'Mensuelle - le 1er jour du mois': 'Monthly - first day of the month',
  'Recherche emploi': 'Job search',
  'Filtres avancés': 'Advanced filters',
  'Masquer les filtres': 'Hide filters',
  'Tri': 'Sort',
  'Plus récentes': 'Newest',
  'Toute expérience': 'Any experience',
  'Débutant (0–2 ans)': 'Junior (0-2 years)',
  'Confirmé (3–5 ans)': 'Mid-level (3-5 years)',
  'Senior (6+ ans)': 'Senior (6+ years)',
  'Type de contrat': 'Contract type',
  'Mode de travail': 'Work mode',
  'Description du poste': 'Job description',
  'Profil recherché': 'Required profile',
  'Postuler': 'Apply',
  'Déjà postulé': 'Already applied',
  'Nouvel onglet': 'New tab',
  'Lieu flexible': 'Flexible location',
  'Non précisé': 'Not specified',
  'Ville non précisée': 'City not specified',
  'Mode non précisé': 'Mode not specified',
  'Offres publiées': 'Published jobs',
  'Formations & événements': 'Training & events',
  'Offre sélectionnée': 'Selected job',
  'Quiz de présélection': 'Prescreening quiz',
  'Connexion requise': 'Login required',
  'Créer un compte': 'Create account',
  'Lettre de motivation': 'Cover letter',
  'Message au candidat': 'Message to candidate',
  'Notes': 'Notes',
  'Enregistrer la note': 'Save note',
  'CV': 'Resume',
  'Télécharger le CV': 'Download resume',
  'Entretien': 'Interview',
  'Envoyée': 'Sent',
  'Présélection': 'Screening',
  'Offre reçue': 'Offer received',
  'Parcourir les offres': 'Browse jobs',
  'Rechercher des offres': 'Search jobs',
  'Tout marquer lu': 'Mark all as read',
  'Notifications': 'Notifications',
  'Aucune notification': 'No notifications',
  'Ajouter le logo': 'Add logo',
  'Modifier le quiz': 'Edit quiz',
  'Configurer le quiz': 'Configure quiz',
  'Enregistrer le quiz': 'Save quiz',
  'Question': 'Question',
  'Réponse': 'Answer',
  'Bonne réponse': 'Correct answer',
  'Supprimer la question': 'Delete question',
  'Ajouter une question': 'Add question',
  'Archives': 'Archives',
  'Offres archivées': 'Archived jobs',
  'Membres': 'Members',
  'Rôle': 'Role',
  'Propriétaire': 'Owner',
  'Administrateur': 'Administrator',
  'Recruteur': 'Recruiter',
  'Inscription centre de formation': 'Training center registration',
  'Inscription établissement privé': 'Private institution registration',
  'Envoyer ma demande': 'Send my request',
  'Fil d’Ariane': 'Breadcrumb',
  "Fil d'Ariane": 'Breadcrumb',
  'Centres de formation': 'Training centers',
  'Établissements privés': 'Private institutions',
  'Informations personnelles': 'Personal information',
  'Les informations de base visibles sur votre CV et vos candidatures.': 'Basic information visible on your resume and applications.',
  'Titre professionnel': 'Professional title',
  'Salaire minimum souhaité (€)': 'Desired minimum salary (€)',
  'Résumé professionnel': 'Professional summary',
  'Résumé': 'Summary',
  'Compétences clés': 'Key skills',
  'Compétences': 'Skills',
  'Expérience professionnelle': 'Professional experience',
  'Ajouter une expérience': 'Add experience',
  '+ Ajouter une expérience': '+ Add experience',
  'Poste': 'Role',
  "Nom de l'entreprise": 'Company name',
  'Début': 'Start',
  'Fin': 'End',
  'Poste occupé jusqu’à présent': 'Current role',
  'Missions principales': 'Main responsibilities',
  'Ajouter une formation': 'Add education',
  '+ Ajouter une formation': '+ Add education',
  'Établissement': 'Institution',
  'Diplôme / spécialité': 'Degree / specialty',
  'Fin / obtention': 'End / graduation',
  'Préférences & liens': 'Preferences & links',
  'Liens et mobilité': 'Links and mobility',
  'Profil LinkedIn': 'LinkedIn profile',
  'Portfolio / site personnel': 'Portfolio / personal website',
  'Mobilité': 'Mobility',
  'Lieux souhaités': 'Preferred locations',
  'Langues': 'Languages',
  'Certifications': 'Certifications',
  'Aperçu recruteur': 'Recruiter preview',
  'Continuer': 'Continue',
  'Génération du CV PDF…': 'Generating resume PDF...',
  'Enregistrer et générer mon CV PDF': 'Save and generate my resume PDF',
  'Navigation du profil': 'Profile navigation',
  'Étapes du profil': 'Profile steps',
  'Ajouter une compétence puis Entrée': 'Add a skill then press Enter',
  'Ex. Développeur full-stack': 'E.g. Full-stack developer',
  'Résumez vos responsabilités, réalisations ou technologies utilisées…': 'Summarize your responsibilities, achievements or technologies used...',
  'Université, école…': 'University, school...',
  'Ex. Master informatique': 'E.g. Computer science master',
  'Complétion du profil': 'Profile completion',
  'Manque :': 'Missing:',
  'Consultation seule : demandez au responsable RH de vous accorder le droit de modifier l’entreprise.': 'Read-only mode: ask the HR owner to grant you permission to edit the company.',
  'Identité visuelle': 'Visual identity',
  'Logo affiché sur vos offres et votre page employeur.': 'Logo shown on your jobs and employer page.',
  'Identité légale': 'Legal identity',
  'Raison sociale et forme juridique (France).': 'Legal name and legal form (France).',
  'Nom commercial / marque employeur': 'Commercial name / employer brand',
  'Raison sociale (si différente)': 'Legal name (if different)',
  'Forme juridique': 'Legal form',
  'Année de création': 'Year founded',
  'N° TVA intracommunautaire': 'Intra-community VAT number',
  'Siège & contact': 'Head office & contact',
  'Code postal': 'Postal code',
  'Pays': 'Country',
  'Pays fréquents': 'Frequent countries',
  'Tous les pays': 'All countries',
  'E-mail de contact RH': 'HR contact email',
  'Téléphone entreprise': 'Company phone',
  'Page LinkedIn': 'LinkedIn page',
  'Activité': 'Activity',
  'Secteur d’activité': 'Industry',
  'Effectif': 'Company size',
  'Présentation de l’entreprise': 'Company presentation',
  'Votre rôle (responsable RH)': 'Your role (HR owner)',
  'Votre poste': 'Your job title',
  'Votre téléphone': 'Your phone',
  'Enregistrer le profil entreprise': 'Save company profile',
  'Public': 'Public',
  'Privé': 'Private',
  'Identité du compte': 'Account identity',
  'Ces informations créent votre accès à l’espace professionnel.': 'This information creates your professional workspace access.',
  'Mot de passe': 'Password',
  'Coordonnées rapides': 'Quick contact details',
  'Ces données préremplissent votre fiche et pourront être complétées après validation.': 'This data pre-fills your profile and can be completed after approval.',
  'Aller à la connexion': 'Go to login',
  'Déjà inscrit ? Connexion': 'Already registered? Login',
  'Créez votre compte. Un administrateur validera votre demande avant publication.': 'Create your account. An administrator will approve your request before publication.',
  '8 caractères minimum': '8 characters minimum',
  'Ex. Tunis': 'E.g. Tunis',
  'Construisez un profil clair pour postuler plus vite': 'Build a clear profile to apply faster',
  'Complétez les informations essentielles, ajoutez votre CV et mettez en avant vos expériences.': 'Complete the essential information, add your resume and highlight your experience.',
  'Créez votre profil pour commencer à postuler.': 'Create your profile to start applying.',
  'Ajoutez ou générez votre CV PDF.': 'Add or generate your resume PDF.',
  'Continuez à enrichir votre profil.': 'Keep improving your profile.',
  'Profil prêt pour les recruteurs.': 'Profile ready for recruiters.',
  'CV et identité': 'Resume and identity',
  'CV disponible': 'Resume available',
  'CV à compléter': 'Resume to complete',
  'Complétez les 4 étapes. Le résumé et la photo se gèrent ici ; LinkedIn et langues à l’étape Préférences. Un CV PDF sera généré automatiquement.': 'Complete the 4 steps. Summary and photo are managed here; LinkedIn and languages are in the Preferences step. A PDF resume will be generated automatically.',
  'Voir mon CV PDF (recruteurs)': 'View my PDF resume (recruiters)',
  'Génération…': 'Generating...',
  'Régénérer le PDF': 'Regenerate PDF',
  'Photo affichée sur le CV PDF': 'Photo shown on the PDF resume',
  'Un paragraphe court, clair et orienté recruteur.': 'A short, clear paragraph written for recruiters.',
  'Obligatoire pour le CV PDF : ce texte apparaît en premier, sous votre photo (section « Résumé »).': 'Required for the PDF resume: this text appears first, under your photo (Summary section).',
  "Ex. Développeur full-stack passionné, 5 ans d'expérience sur des applications web Angular / Node.js…": 'E.g. Passionate full-stack developer, 5 years of experience on Angular / Node.js web applications...',
  'Ajoutez vos compétences les plus recherchées, une par une.': 'Add your most in-demand skills one by one.',
  'Identité & CV': 'Identity & resume',
  'Préférences': 'Preferences',
  'Liens affichés sur le CV PDF. Photo et résumé : étape': 'Links shown on the PDF resume. Photo and summary: step',
  'Ces informations aident les recruteurs à comprendre vos disponibilités et votre présence en ligne.': 'This information helps recruiters understand your availability and online presence.',
  'Ex. Tunisie, France, télétravail, hybride': 'E.g. Tunisia, France, remote, hybrid',
  'Paris, Lyon… (séparés par des virgules)': 'Paris, Lyon... (separated by commas)',
  'Ajoutez les langues utiles pour vos candidatures.': 'Add useful languages for your applications.',
  'Ex. Français, Anglais': 'E.g. French, English',
  'Ajoutez vos certifications, diplômes courts ou badges professionnels.': 'Add your certifications, short diplomas or professional badges.',
  'Annuaire sociétés': 'Company directory',
  'Formations professionnelles': 'Professional training',
  'Annuaire établissements': 'Institution directory',
  'Découvrez les sociétés qui publient des offres actives.': 'Discover companies publishing active jobs.',
  'Découvrez des centres validés, comparez leurs formations et inscrivez-vous en quelques clics.': 'Discover approved centers, compare their training programs and register in a few clicks.',
  'Explorez les établissements privés référencés.': 'Explore listed private institutions.',
  'Espace candidat': 'Candidate workspace',
  'Recherche': 'Search',
  'Domaine': 'Domain',
  'Mode': 'Mode',
  'Type': 'Type',
  'Nom, domaine, secteur...': 'Name, domain, industry...',
  'Ville...': 'City...',
  'Ex. informatique, commerce': 'E.g. IT, commerce',
  'Chargement des détails...': 'Loading details...',
  'Retour à l’annuaire': 'Back to directory',
  'Société sélectionnée': 'Selected company',
  'Centre sélectionné': 'Selected center',
  'Établissement sélectionné': 'Selected institution',
  'Secteur non précisé': 'Industry not specified',
  'Domaine non précisé': 'Domain not specified',
  'Lieu non précisé': 'Location not specified',
  'Salaire non précisé': 'Salary not specified',
  'Cliquez sur une offre pour ouvrir sa fiche complète et postuler.': 'Click a job to open the full page and apply.',
  'Cliquez sur une carte pour voir le détail et vous inscrire.': 'Click a card to view details and register.',
  'Programmes, événements et annonces publiés par l’établissement.': 'Programs, events and announcements published by the institution.',
  'Aucune formation ou événement publié.': 'No training program or event published.',
  'Aucune publication disponible.': 'No publication available.',
  'Aucune société trouvée.': 'No company found.',
  'Aucun centre trouvé.': 'No center found.',
  'Aucun établissement trouvé.': 'No institution found.',
  'Pagination de l’annuaire': 'Directory pagination',
  'Chargement de l’offre...': 'Loading job...',
  'Avantages': 'Benefits',
  'Répondez au quiz avant de postuler': 'Answer the quiz before applying',
  'Votre candidature ne peut être envoyée qu’après avoir répondu à toutes les questions.': 'Your application can only be sent after answering all questions.',
  'Quiz complété.': 'Quiz completed.',
  'Rédigez votre lettre ou utilisez l’assistant IA, puis envoyez votre candidature.': 'Write your letter or use the AI assistant, then send your application.',
  'Génération en cours...': 'Generating...',
  'Assistant IA : générer une lettre personnalisée': 'AI assistant: generate a personalized letter',
  'Votre lettre de motivation...': 'Your cover letter...',
  'Retour quiz': 'Back to quiz',
  'Envoi...': 'Sending...',
  'Envoyer ma candidature': 'Send my application',
  'Déjà inscrit': 'Already registered',
  "S'inscrire": 'Register',
  'Inscription...': 'Registering...',
  'Durée :': 'Duration:',
  'Certificat délivré à l’issue de la formation.': 'Certificate delivered at the end of the training.',
  'Contact': 'Contact',
  'Détails': 'Details',
  'Lien officiel': 'Official link',
  'Aucune description disponible.': 'No description available.',
  'Programme': 'Program',
  'Annonce': 'Announcement',
  'Je suis intéressé': 'I am interested',
  'Confirmer votre intérêt': 'Confirm your interest',
  'Confirmer l’inscription': 'Confirm registration',
  'Intérêt enregistré.': 'Interest saved.',
  'Inscription enregistrée.': 'Registration saved.',
  'Candidature enregistrée.': 'Application saved.',
  'Déjà intéressé': 'Already interested',
  'Date non précisée': 'Date not specified',
  'Traitement...': 'Processing...',
  'Gérez vos notifications, votre e-mail et votre mot de passe.': 'Manage your notifications, email and password.',
  'Espace recruteur': 'Recruiter workspace',
  'Rôle, permissions et raccourcis utiles pour votre travail quotidien.': 'Role, permissions and useful shortcuts for your daily work.',
  'Entreprise non chargée': 'Company not loaded',
  'Publier des offres': 'Publish jobs',
  'Traiter les candidatures': 'Process applications',
  'Modifier l’entreprise': 'Edit company',
  'Notifications candidatures': 'Application notifications',
  'Droits équipe': 'Team permissions',
  'Canaux et alertes utiles.': 'Useful channels and alerts.',
  'Préférences enregistrées.': 'Preferences saved.',
  'E-mails': 'Emails',
  'Notifications in-app': 'In-app notifications',
  'Statut candidature': 'Application status',
  'Message recruteur': 'Recruiter message',
  'Alertes emploi': 'Job alerts',
  'Enregistrer les préférences': 'Save preferences',
  'Adresse e-mail': 'Email address',
  'E-mail actuel :': 'Current email:',
  'Mode développement — SMTP indisponible': 'Development mode - SMTP unavailable',
  'Ouvrez ce lien pour confirmer votre nouvelle adresse :': 'Open this link to confirm your new address:',
  'Nouvel e-mail': 'New email',
  'Mot de passe actuel': 'Current password',
  'Mise à jour…': 'Updating...',
  'Mettre à jour l’e-mail': 'Update email',
  'Sécurisez l’accès à votre compte.': 'Secure access to your account.',
  'Actuel': 'Current',
  'Nouveau': 'New',
  'Exigences': 'Requirements',
  'Majuscules et minuscules': 'Uppercase and lowercase letters',
  'Au moins un chiffre et un caractère spécial': 'At least one number and one special character',
  'Mettre à jour le mot de passe': 'Update password',
  'Suivi des candidatures': 'Application tracking',
  'Filtrer par offre': 'Filter by job',
  'Toutes les offres': 'All jobs',
  'Tout afficher': 'Show all',
  'Chargement des candidatures...': 'Loading applications...',
  'Aucun candidat': 'No candidate',
  'Aucune candidature sur cette page.': 'No applications on this page.',
  'Postulé': 'Applied',
  'Salaire min.': 'Min. salary',
  'Aperçu CV': 'Resume preview',
  'Message optionnel envoyé lors du prochain changement d’étape ou de note…': 'Optional message sent at the next stage or note change...',
  'Note interne visible seulement par l’équipe recruteur…': 'Internal note visible only to the recruiter team...',
  'Pagination historique recruteur': 'Recruiter history pagination',
  'Historique recruteur': 'Recruiter history',
  'rejetées archivées': 'archived rejected',
  'anciennes ou expirées': 'old or expired',
  'fin de publication': 'end of publication',
  'retirées manuellement': 'manually removed',
  'Chargement des archives...': 'Loading archives...',
  'Aucune candidature rejetée archivée.': 'No archived rejected applications.',
  'Quand un recruteur rejette une candidature, elle apparaîtra ici automatiquement.': 'When a recruiter rejects an application, it will appear here automatically.',
  'Aucune offre archivée.': 'No archived jobs.',
  'Les offres archivées ou expirées seront affichées ici.': 'Archived or expired jobs will appear here.',
  'Nom commercial / marque employeur *': 'Trade name / employer brand *',
  'SIRET (14 chiffres)': 'SIRET (14 digits)',
  'E-mail de contact RH *': 'HR contact email *',
  'Secteur d’activité *': 'Industry *',
  'Effectif *': 'Company size *',
  'Présentation de l’entreprise *': 'Company presentation *',
  'E-mail actuel': 'Current email',
  'Confirmer l’e-mail': 'Confirm email',
  'Nouveau mot de passe': 'New password',
  'Confirmer le mot de passe': 'Confirm password',
  'Confirmer l’enregistrement du profil': 'Confirm profile save',
  'Confirmer la modification': 'Confirm change',
  'Inscrits à cette formation': 'Registrants for this training',
  'Inscrits à cet événement': 'Registrants for this event',
  'Nom visible dans le catalogue et sur la fiche publique.': 'Name visible in the catalog and public page.',
  'Nom affiché dans le catalogue et dans les listes candidat.': 'Name shown in the catalog and candidate lists.',
  'Texte court visible sur les cartes du catalogue. Expliquez le résultat obtenu par l’apprenant.': 'Short text visible on catalog cards. Explain the outcome for the learner.',
  'Exemples : 40 h, 3 mois, 6 semaines.': 'Examples: 40 h, 3 months, 6 weeks.',
  'Ajoutez un logo carré ou horizontal, JPG/PNG/WEBP — 2 Mo max.': 'Add a square or horizontal logo, JPG/PNG/WEBP - max 2 MB.',
  'Ajoutez une plaquette officielle téléchargeable depuis votre fiche publique.': 'Add an official brochure downloadable from your public page.',
  'Votre compte doit être validé par un administrateur pour publier sur le site public.': 'Your account must be approved by an administrator to publish on the public site.',
  'Complétez le profil (logo, description, ville) pour débloquer la publication.': 'Complete the profile (logo, description, city) to unlock publication.',
  'Brouillons à compléter': 'Drafts to complete',
  'Offres privées, non visibles publiquement. Complétez-les puis envoyez-les en validation.': 'Private items, not publicly visible. Complete them then submit for review.',
  'Publications visibles': 'Visible publications',
  'Contenus validés par l’administrateur et visibles publiquement.': 'Content approved by the administrator and publicly visible.',
  'Formations validées': 'Approved training programs',
  'Événements validés': 'Approved events',
  'À corriger': 'To correct',
  'Contenus refusés. Corrigez-les puis renvoyez-les en validation.': 'Rejected content. Correct it then resubmit for review.',
  'Toutes vos publications': 'All your publications',
  'Recherchez, filtrez et suivez le statut de vos programmes, événements et annonces.': 'Search, filter and track the status of your programs, events and announcements.',
  'Tous les types': 'All types',
  'Tous les statuts': 'All statuses',
  'Aucune publication trouvée.': 'No publication found.',
  'Publications existantes': 'Existing publications',
  'Créez une publication claire, relue et prête pour validation administrateur.': 'Create a clear, reviewed publication ready for admin validation.',
  'Contenu public': 'Public content',
  'Ce bloc construit la carte visible par les candidats.': 'This block builds the card visible to candidates.',
  'Soumettre à validation': 'Submit for review',
  'Toute modification sera renvoyée en validation administrateur.': 'Any change will be sent back for admin review.',
  'Détail utilisateur': 'User details',
  'Modifier le compte, le mot de passe, modérer et consulter les IP.': 'Edit account, password, moderation and IP history.',
  'E-mail vérifié': 'Email verified',
  'E-mail non vérifié': 'Email not verified',
  'Accès bloqué': 'Access blocked',
  'Accès actif': 'Access active',
  'Informations du compte': 'Account information',
  'Identifiant': 'Identifier',
  'Dernière IP (IPv4)': 'Last IP (IPv4)',
  'Informations métier': 'Business information',
  'Modération': 'Moderation',
  'Raison du bannissement': 'Ban reason',
  'Historique des connexions (IP)': 'Login history (IP)',
  'Adresse IP (IPv4)': 'IP address (IPv4)',
  'Navigateur': 'Browser',
  'Aucune connexion enregistrée pour le moment': 'No login recorded yet',
  'Saisissez une adresse e-mail valide.': 'Enter a valid email address.',
  'La nouvelle adresse doit être différente de l’actuelle.': 'The new address must be different from the current one.',
  'Confirmez la nouvelle adresse e-mail.': 'Confirm the new email address.',
  'Les deux adresses e-mail ne correspondent pas.': 'The two email addresses do not match.',
  'Le mot de passe actuel est requis pour modifier l’e-mail.': 'The current password is required to change the email.',
  'Le mot de passe actuel est requis.': 'The current password is required.',
  'Le nouveau mot de passe doit être différent de l’actuel.': 'The new password must be different from the current one.',
  'Veuillez confirmer le mot de passe.': 'Please confirm the password.',
  'Les mots de passe ne correspondent pas.': 'Passwords do not match.',
  'Pied de page global': 'Global footer',
  'Recrutement simplifié pour candidats, recruteurs, centres de formation et établissements.': 'Simplified recruitment for candidates, recruiters, training centers and institutions.',
  'Réseaux sociaux': 'Social networks',
  'Navigation du site': 'Site navigation',
  'Contacts': 'Contacts',
  'Assistance technique et aide aux utilisateurs': 'Technical support and user assistance',
  'Requêtes administratives et de gestion': 'Administrative and management requests',
  'Demandes d’informations générales': 'General information requests',
  'Prises de contact professionnelles et partenariats': 'Professional contact and partnerships',
  'Tous droits réservés.': 'All rights reserved.',
};

type PatternTranslation = {
  pattern: RegExp;
  replace: (match: RegExpMatchArray) => string;
};

const PATTERN_TRANSLATIONS: PatternTranslation[] = [
  { pattern: /^Étape (\d+)$/, replace: (m) => `Step ${m[1]}` },
  { pattern: /^Expérience (\d+)$/, replace: (m) => `Experience ${m[1]}` },
  { pattern: /^Formation (\d+)$/, replace: (m) => `Education ${m[1]}` },
  { pattern: /^Page (\d+) \/ (\d+)$/, replace: (m) => `Page ${m[1]} / ${m[2]}` },
  { pattern: /^(\d+) résultat\(s\)$/, replace: (m) => `${m[1]} result(s)` },
  { pattern: /^(\d+) offre\(s\) active\(s\)$/, replace: (m) => `${m[1]} active job(s)` },
  { pattern: /^(\d+) publication\(s\)$/, replace: (m) => `${m[1]} publication(s)` },
  { pattern: /^(\d+) place\(s\)$/, replace: (m) => `${m[1]} seat(s)` },
  { pattern: /^(\d+) inscrit\(s\)$/, replace: (m) => `${m[1]} registrant(s)` },
  { pattern: /^(\d+) réponse\(s\)$/, replace: (m) => `${m[1]} response(s)` },
  { pattern: /^(.+) sélectionné\(e\)$/, replace: (m) => `${translateStatic(m[1])} selected` },
  { pattern: /^(.+) an\(s\) d’expérience$/, replace: (m) => `${m[1]} year(s) experience` },
];

function translateStatic(value: string): string {
  return STATIC_TEXT_TRANSLATIONS[value] ?? value;
}

@Injectable({ providedIn: 'root' })
export class AutoI18nService {
  private readonly document = inject(DOCUMENT);
  private readonly i18n = inject(I18nService);
  private readonly originalText = new WeakMap<Text, string>();
  private readonly originalAttributes = new WeakMap<Element, Partial<Record<(typeof TRANSLATABLE_ATTRIBUTES)[number], string>>>();
  private observer: MutationObserver | null = null;
  private applying = false;

  constructor() {
    effect(() => {
      this.i18n.language();
      this.scheduleApply();
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('jobboard:languagechange', () => this.scheduleApply());
    }

    this.startObserver();
  }

  private startObserver(): void {
    if (typeof MutationObserver === 'undefined') {
      return;
    }

    this.observer = new MutationObserver(() => {
      if (!this.applying) {
        this.scheduleApply();
      }
    });

    this.observer.observe(this.document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });
  }

  private scheduleApply(): void {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => this.apply());
      return;
    }

    setTimeout(() => this.apply());
  }

  private apply(): void {
    const body = this.document.body;
    if (!body) return;

    this.applying = true;
    try {
      this.walk(body);
    } finally {
      this.applying = false;
    }
  }

  private walk(root: Node): void {
    if (root.nodeType === Node.TEXT_NODE) {
      this.translateTextNode(root as Text);
      return;
    }

    if (root.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = root as Element;
    if (this.shouldSkipElement(element)) {
      return;
    }

    this.translateAttributes(element);
    if (this.shouldSkipChildren(element)) {
      return;
    }

    for (const child of Array.from(element.childNodes)) {
      this.walk(child);
    }
  }

  private translateTextNode(node: Text): void {
    const original = this.originalText.get(node) ?? node.data;
    this.originalText.set(node, original);

    const translated = this.translateValue(original, node.data);
    if (node.data !== translated) {
      node.data = translated;
    }
  }

  private translateAttributes(element: Element): void {
    let originals = this.originalAttributes.get(element);
    if (!originals) {
      originals = {};
      this.originalAttributes.set(element, originals);
    }

    for (const attr of TRANSLATABLE_ATTRIBUTES) {
      if (!element.hasAttribute(attr)) continue;
      const current = element.getAttribute(attr) ?? '';
      const original = originals[attr] ?? current;
      originals[attr] = original;

      const translated = this.translateValue(original, current);
      if (current !== translated) {
        element.setAttribute(attr, translated);
      }
    }
  }

  private translateValue(value: string, currentValue = value): string {
    const leading = value.match(/^\s*/)?.[0] ?? '';
    const trailing = value.match(/\s*$/)?.[0] ?? '';
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (this.i18n.language() === 'fr') {
      return this.hasAutoTranslation(normalized) ? value : currentValue;
    }

    const translated = STATIC_TEXT_TRANSLATIONS[normalized] ?? this.translatePattern(normalized);
    return translated ? `${leading}${translated}${trailing}` : currentValue;
  }

  private hasAutoTranslation(value: string): boolean {
    return Boolean(STATIC_TEXT_TRANSLATIONS[value] ?? this.translatePattern(value));
  }

  private translatePattern(value: string): string | null {
    for (const item of PATTERN_TRANSLATIONS) {
      const match = value.match(item.pattern);
      if (match) {
        return item.replace(match);
      }
    }

    return null;
  }

  private shouldSkipElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    if (['script', 'style'].includes(tagName)) {
      return true;
    }

    return Boolean(
      element.closest(
        '[data-i18n-skip], app-safe-html, .ql-editor, [contenteditable="true"], .rich-text-content'
      )
    );
  }

  private shouldSkipChildren(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return ['input', 'textarea'].includes(tagName);
  }
}
