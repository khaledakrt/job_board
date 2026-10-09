import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminUserProfileView } from '../../../core/models/admin.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { ProtectedFileService } from '../../../core/services/protected-file.service';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-user-profile-view',
  standalone: true,
  imports: [RouterLink, DatePipe, SafeHtmlComponent],
  templateUrl: './user-profile-view.component.html',
  styleUrl: './user-profile-view.component.css',
})
export class UserProfileViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly protectedFiles = inject(ProtectedFileService);
  readonly routes = APP_ROUTES;

  readonly profile = signal<AdminUserProfileView | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.adminService.getUserProfile(id).subscribe({
      next: (res) => {
        this.profile.set(res.data ?? null);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Profil introuvable');
        this.loading.set(false);
      },
    });
  }

  photoUrl(profile: AdminUserProfileView): string | null {
    return (
      resolveUploadUrl(profile.candidate?.avatarUrl ?? null) ||
      resolveUploadUrl(profile.recruiter?.company?.logoUrl ?? null)
    );
  }

  displayName(profile: AdminUserProfileView): string {
    const candidate = profile.candidate;
    const fullName = `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim();
    if (fullName) return fullName;
    return profile.recruiter?.company?.name || profile.email;
  }

  initials(profile: AdminUserProfileView): string {
    return this.displayName(profile)
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  roleLabel(role: string): string {
    if (role === 'recruiter') return 'Recruteur';
    if (role === 'candidate') return 'Candidat';
    return role;
  }

  period(start?: string, end?: string, current?: boolean): string {
    const from = start || '';
    const to = current ? 'Aujourd’hui' : end || '';
    if (from && to) return `${from} — ${to}`;
    return from || to || '—';
  }

  salaryLabel(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }

  preferenceLabel(value: string): string {
    const labels: Record<string, string> = {
      CDI: 'CDI',
      CDD: 'CDD',
      Freelance: 'Freelance',
      Internship: 'Stage',
      'on-site': 'Sur site',
      hybrid: 'Hybride',
      remote: 'Télétravail',
    };
    return labels[value] || value;
  }

  joinPreferences(values: string[] | null | undefined): string {
    if (!values?.length) return '—';
    return values.map((value) => this.preferenceLabel(value)).join(', ');
  }

  openResume(url: string | null | undefined): void {
    this.protectedFiles.openFile(url, () => this.errorMessage.set('Impossible d’ouvrir le CV.'));
  }
}
