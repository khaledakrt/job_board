import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { TeamService } from '../services/team.service';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { TeamMember, UpdateTeamMemberPayload } from '../../../core/models/recruiter.model';

const PERMISSION_META: {
  key: 'canPostJob' | 'canDecideApplication' | 'canEditCompany';
  label: string;
}[] = [
  { key: 'canPostJob', label: 'Publier des offres' },
  { key: 'canDecideApplication', label: 'Décider sur les candidatures' },
  { key: 'canEditCompany', label: 'Modifier l\'entreprise' },
];

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './team-management.component.html',
  styleUrl: './team-management.component.css',
})
export class TeamManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly teamService = inject(TeamService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  readonly context = inject(RecruiterContextService);

  readonly permissionOptions = PERMISSION_META;

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
        this.errorMessage.set('Impossible de charger l\'équipe.');
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
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    const email = this.inviteForm.controls.email.value;
    const ok = await this.confirmDialog.confirm({
      title: 'Inviter un membre',
      message: `Envoyer une invitation à ${email} ?`,
      confirmLabel: 'Inviter',
    });
    if (!ok) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    this.teamService.invite(this.inviteForm.getRawValue()).subscribe({
      next: () => {
        this.successMessage.set('Membre invité avec succès.');
        this.saving.set(false);
        this.closeModal();
        this.loadMembers();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Échec de l\'invitation.');
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
      title: 'Enregistrer les modifications',
      message: `Mettre à jour les droits de ${member.email} ?`,
      confirmLabel: 'Enregistrer',
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
        this.successMessage.set('Permissions mises à jour.');
        this.saving.set(false);
        this.closeEditModal();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Échec de la mise à jour.');
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
      title: 'Retirer de l\'équipe',
      message: `Retirer ${member.email} de l'équipe ?`,
      confirmLabel: 'Retirer',
      confirmDanger: true,
    });
    if (!ok) return;

    this.teamService.remove(member.id).subscribe({
      next: () => {
        this.successMessage.set('Membre retiré de l\'équipe.');
        this.loadMembers();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Échec de la suppression.');
      },
    });
  }

  permissionLabel(member: TeamMember): string {
    const perms = PERMISSION_META.filter((p) => member[p.key]).map((p) => p.label);
    return perms.length ? perms.join(', ') : 'Aucune permission';
  }

  roleLabel(role: TeamMember['companyRole']): string {
    return role === 'owner' ? 'Responsable RH' : 'Recruteur';
  }
}
