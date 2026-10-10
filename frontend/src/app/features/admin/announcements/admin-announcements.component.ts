import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import {
  AnnouncementRecipient,
  AnnouncementSender,
  SentAnnouncement,
} from '../../../core/models/admin.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-admin-announcements',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './admin-announcements.component.html',
  styleUrl: './admin-announcements.component.css',
})
export class AdminAnnouncementsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmDialog = inject(ConfirmDialogService);
  readonly routes = APP_ROUTES;

  readonly recipients = signal<AnnouncementRecipient[]>([]);
  readonly senders = signal<AnnouncementSender[]>([]);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly failed = signal<{ email: string; error: string }[]>([]);
  readonly roleFilter = signal<'' | 'candidate' | 'recruiter'>('');
  readonly search = signal('');
  readonly selected = signal<Set<string>>(new Set());
  readonly historyOpen = signal(false);
  readonly historyLoading = signal(false);
  readonly sentMessages = signal<SentAnnouncement[]>([]);
  readonly historyTotal = signal(0);
  readonly historySearch = signal('');
  readonly historyRole = signal<'' | 'candidate' | 'recruiter'>('');
  readonly historySender = signal('');
  readonly openedMessageId = signal<string | null>(null);
  private historyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly openedMessage = computed(
    () => this.sentMessages().find((item) => item.id === this.openedMessageId()) ?? null
  );

  readonly form = this.fb.nonNullable.group({
    senderKey: ['support' as 'support' | 'info' | 'administration', Validators.required],
    subject: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(180)]],
    message: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(8000)]],
  });

  readonly visible = computed(() => {
    const role = this.roleFilter();
    const term = this.search().trim().toLowerCase();
    return this.recipients().filter((person) => {
      if (role && person.role !== role) return false;
      if (!term) return true;
      return person.email.toLowerCase().includes(term) || person.name.toLowerCase().includes(term);
    });
  });

  readonly selectedCount = computed(() => this.selected().size);
  readonly allVisibleSelected = computed(() => {
    const rows = this.visible();
    return rows.length > 0 && rows.every((person) => this.selected().has(person.id));
  });

  ngOnInit(): void {
    this.adminService.getAnnouncementRecipients().subscribe({
      next: (res) => {
        this.recipients.set(res.data?.items ?? []);
        this.senders.set(res.data?.senders ?? []);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible de charger les destinataires');
        this.loading.set(false);
      },
    });
  }

  roleLabel(role: string): string {
    return role === 'recruiter' ? 'Recruteur' : 'Candidat';
  }

  isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  toggle(id: string): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleVisible(): void {
    const rows = this.visible();
    const selectAll = !this.allVisibleSelected();
    this.selected.update((current) => {
      const next = new Set(current);
      for (const person of rows) {
        if (selectAll) next.add(person.id);
        else next.delete(person.id);
      }
      return next;
    });
  }

  selectRole(role: '' | 'candidate' | 'recruiter'): void {
    this.roleFilter.set(role);
    const ids = this.recipients()
      .filter((person) => !role || person.role === role)
      .map((person) => person.id);
    this.selected.set(new Set(ids));
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  toggleHistory(): void {
    const next = !this.historyOpen();
    this.historyOpen.set(next);
    this.openedMessageId.set(null);
    if (next) this.loadHistory();
  }

  openMessage(id: string): void {
    this.openedMessageId.set(this.openedMessageId() === id ? null : id);
  }

  onHistorySearch(value: string): void {
    this.historySearch.set(value);
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.historyTimer = setTimeout(() => this.loadHistory(), 300);
  }

  onHistoryRole(role: '' | 'candidate' | 'recruiter'): void {
    this.historyRole.set(role);
    this.openedMessageId.set(null);
    this.loadHistory();
  }

  onHistorySender(sender: string): void {
    this.historySender.set(sender);
    this.openedMessageId.set(null);
    this.loadHistory();
  }

  loadHistory(): void {
    this.historyLoading.set(true);
    const search = this.historySearch().trim();
    const role = this.historyRole();
    const sender = this.historySender();
    this.adminService
      .getSentAnnouncements({
        search: search || undefined,
        role: role || undefined,
        sender: sender || undefined,
      })
      .subscribe({
      next: (res) => {
        this.sentMessages.set(res.data?.items ?? []);
        this.historyTotal.set(res.data?.total ?? res.data?.items?.length ?? 0);
        this.historyLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible de charger les messages envoyés');
        this.historyLoading.set(false);
      },
    });
  }

  async send(): Promise<void> {
    this.successMessage.set(null);
    this.failed.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const missing = [
        this.form.controls.subject.invalid ? 'un objet' : '',
        this.form.controls.message.invalid ? 'un message' : '',
      ].filter(Boolean);
      this.errorMessage.set(`Indiquez ${missing.join(' et ')}.`);
      return;
    }
    const ids = [...this.selected()];
    if (!ids.length) {
      this.errorMessage.set('Choisissez au moins un destinataire.');
      return;
    }
    const sender = this.senders().find((item) => item.key === this.form.controls.senderKey.value);
    const confirmed = await this.confirmDialog.confirm({
      title: 'Envoyer le message',
      message: `Envoyer ce message à ${ids.length} personne(s) depuis ${sender?.email || 'la boîte choisie'} ? Chaque destinataire reçoit son propre e-mail.`,
      confirmLabel: 'Envoyer',
    });
    if (!confirmed) return;

    this.sending.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();
    this.adminService
      .sendAnnouncement({
        senderKey: value.senderKey,
        subject: value.subject.trim(),
        message: value.message.trim(),
        userIds: ids,
      })
      .subscribe({
        next: (res) => {
          const data = res.data;
          this.successMessage.set(res.message || 'Message envoyé');
          this.failed.set(data?.failed ?? []);
          if (!data?.failed?.length) {
            this.form.controls.subject.setValue('');
            this.form.controls.message.setValue('');
          }
          this.sending.set(false);
          if (this.historyOpen()) this.loadHistory();
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(err.error?.message || 'Impossible d’envoyer le message');
          this.sending.set(false);
        },
      });
  }
}
