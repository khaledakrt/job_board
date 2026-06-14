import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { TeamService } from '../services/team.service';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { TeamMember, UpdateTeamMemberPayload } from '../../../core/models/recruiter.model';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

const PERMISSION_META: {
  key: 'canPostJob' | 'canDecideApplication' | 'canEditCompany';
  labelKey: string;
}[] = [
  { key: 'canPostJob', labelKey: 'recruiter.team.permissionPostJob' },
  { key: 'canDecideApplication', labelKey: 'recruiter.team.permissionDecideApplication' },
  { key: 'canEditCompany', labelKey: 'recruiter.team.permissionEditCompany' },
];
const TEAM_MEMBER_LIMIT = 10;

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './team-management.component.html',
  styleUrl: './team-management.component.css',
})
export class TeamManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly teamService = inject(TeamService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly i18n = inject(I18nService);
  readonly context = inject(RecruiterContextService);

  readonly permissionOptions = PERMISSION_META;
  readonly teamLimit = TEAM_MEMBER_LIMIT;

  readonly members = signal<TeamMember[]>([]);
  readonly loading = signal(false);
  readonly modalOpen = signal(false);
  readonly editModalOpen = signal(false);
  readonly editingMember = signal<TeamMember | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    jobTitle: [''],
    phone: [''],
    canPostJob: [false],
    canDecideApplication: [false],
    canEditCompany: [false],
  });

  readonly editForm = this.fb.nonNullable.group({
    jobTitle: [''],
    phone: [''],
    canPostJob: [false],
    canDecideApplication: [false],
    canEditCompany: [false],
  });

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    this.loading.set(true);
    this.teamService.list().subscribe({
      next: (res) => {
        this.members.set(res.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set(this.i18n.translate('recruiter.team.loadError'));
        this.loading.set(false);
      },
    });
  }

  canManageTeam(): boolean {
    return this.context.isOwner();
  }

  canEditMember(member: TeamMember): boolean {
    return this.canManageTeam() && member.companyRole !== 'owner';
  }

  openInviteModal(): void {
    if (this.members().length >= TEAM_MEMBER_LIMIT) {
      this.errorMessage.set(this.teamLimitMessage());
      return;
    }

    this.inviteForm.reset({
      email: '',
      jobTitle: '',
      phone: '',
      canPostJob: false,
      canDecideApplication: false,
      canEditCompany: false,
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  openEditModal(member: TeamMember): void {
    if (!this.canEditMember(member)) return;
    this.editingMember.set(member);
    this.editForm.reset({
      jobTitle: member.jobTitle || '',
      phone: member.phone || '',
      canPostJob: member.canPostJob,
      canDecideApplication: member.canDecideApplication,
      canEditCompany: member.canEditCompany,
    });
    this.editModalOpen.set(true);
  }

  closeEditModal(): void {
    this.editModalOpen.set(false);
    this.editingMember.set(null);
  }

  async submitInvite(): Promise<void> {
    if (this.members().length >= TEAM_MEMBER_LIMIT) {
      this.errorMessage.set(this.teamLimitMessage());
      return;
    }

    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    const email = this.inviteForm.controls.email.value;
    const ok = await this.confirmDialog.confirm({
      title: this.i18n.translate('recruiter.team.inviteMember'),
      message: `${this.i18n.translate('recruiter.team.inviteConfirmPrefix')} ${email} ?`,
      confirmLabel: this.i18n.translate('recruiter.team.invite'),
    });
    if (!ok) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    this.teamService.invite(this.inviteForm.getRawValue()).subscribe({
      next: () => {
        this.successMessage.set(this.i18n.translate('recruiter.team.inviteSuccess'));
        this.saving.set(false);
        this.closeModal();
        this.loadMembers();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || this.i18n.translate('recruiter.team.inviteFailed'));
        this.saving.set(false);
      },
    });
  }

  async submitEdit(): Promise<void> {
    const member = this.editingMember();
    if (!member || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const ok = await this.confirmDialog.confirm({
      title: this.i18n.translate('recruiter.team.saveChanges'),
      message: `${this.i18n.translate('recruiter.team.updateRightsPrefix')} ${member.email} ?`,
      confirmLabel: this.i18n.translate('actions.save'),
    });
    if (!ok) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    const raw = this.editForm.getRawValue();
    const payload: UpdateTeamMemberPayload = {
      jobTitle: raw.jobTitle || null,
      phone: raw.phone || null,
      canPostJob: raw.canPostJob,
      canDecideApplication: raw.canDecideApplication,
      canEditCompany: raw.canEditCompany,
    };

    this.teamService.update(member.id, payload).subscribe({
      next: (res) => {
        this.patchMember(res.data);
        this.successMessage.set(this.i18n.translate('recruiter.team.permissionsUpdated'));
        this.saving.set(false);
        this.closeEditModal();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || this.i18n.translate('recruiter.team.updateFailed'));
        this.saving.set(false);
      },
    });
  }

  private patchMember(updated: TeamMember | undefined): void {
    if (!updated) return;
    this.members.update((list) =>
      list.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
    );
  }

  async removeMember(member: TeamMember): Promise<void> {
    if (member.companyRole === 'owner' || !this.canManageTeam()) {
      return;
    }

    const ok = await this.confirmDialog.confirm({
      title: this.i18n.translate('recruiter.team.removeFromTeam'),
      message: `${this.i18n.translate('recruiter.team.removeConfirmPrefix')} ${member.email} ${this.i18n.translate('recruiter.team.removeConfirmSuffix')}`,
      confirmLabel: this.i18n.translate('recruiter.team.remove'),
      confirmDanger: true,
    });
    if (!ok) return;

    this.teamService.remove(member.id).subscribe({
      next: () => {
        this.successMessage.set(this.i18n.translate('recruiter.team.removeSuccess'));
        this.loadMembers();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || this.i18n.translate('recruiter.team.removeFailed'));
      },
    });
  }

  permissionLabel(member: TeamMember): string {
    const perms = PERMISSION_META.filter((p) => member[p.key]).map((p) => this.i18n.translate(p.labelKey));
    return perms.length ? perms.join(', ') : this.i18n.translate('recruiter.team.noPermission');
  }

  roleLabel(role: TeamMember['companyRole']): string {
    return role === 'owner' ? this.i18n.translate('recruiter.team.ownerRole') : this.i18n.translate('recruiter.team.recruiterRole');
  }

  private teamLimitMessage(): string {
    return `${this.i18n.translate('recruiter.team.limitReachedPrefix')} ${TEAM_MEMBER_LIMIT} ${this.i18n.translate('recruiter.team.limitReachedSuffix')}`;
  }
}
