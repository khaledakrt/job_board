import { Component, computed, input, output, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  EducationBlock,
  ExperienceBlock,
  ResumeParseResult,
} from '../../../../core/models/candidate-profile.model';

type SectionKey = 'identity' | 'skills' | 'experiences' | 'education';

@Component({
  selector: 'app-cv-parse-preview',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './cv-parse-preview.component.html',
  styleUrl: './cv-parse-preview.component.css',
})
export class CvParsePreviewComponent {
  private readonly fb = new FormBuilder();

  readonly data = input.required<ResumeParseResult>();
  readonly apply = output<ResumeParseResult>();
  readonly cancel = output<void>();

  readonly skillInput = signal('');
  readonly showBio = signal(false);

  readonly expanded = signal<Record<SectionKey, boolean>>({
    identity: true,
    skills: true,
    experiences: true,
    education: true,
  });

  readonly identityForm = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    phone: [''],
    professionalTitle: [''],
    bio: [''],
  });

  readonly skills = signal<string[]>([]);
  readonly experiences = this.fb.array([this.createExperienceGroup()]);
  readonly education = this.fb.array([this.createEducationGroup()]);

  readonly summary = computed(() => ({
    skills: this.skills().length,
    experiences: this.experiences.length,
    education: this.education.length,
  }));

  hydrateFromData(d: ResumeParseResult): void {
    this.identityForm.patchValue({
      firstName: sanitizeText(d.first_name || ''),
      lastName: sanitizeText(d.last_name || ''),
      phone: sanitizeText(d.phone || ''),
      professionalTitle: sanitizeText(d.professional_title || ''),
      bio: sanitizeText(d.bio || ''),
    });
    this.showBio.set(Boolean(d.bio?.trim()));
    this.skills.set(normalizeSkills(d.skills || []));

    this.experiences.clear();
    if (d.experiences?.length) {
      d.experiences.forEach((e) => {
        const dates = splitDateRange(
          sanitizeText(e.startDate || ''),
          sanitizeText(e.endDate || '')
        );
        this.experiences.push(
          this.fb.group({
            title: [sanitizeText(e.title || '')],
            company: [sanitizeText(e.company || '')],
            startDate: [dates.start],
            endDate: [dates.end],
            description: [sanitizeText(e.description || '')],
          })
        );
      });
    } else {
      this.experiences.push(this.createExperienceGroup());
    }

    this.education.clear();
    if (d.education?.length) {
      d.education.forEach((e) => {
        const dates = splitDateRange(
          sanitizeText(e.startDate || ''),
          sanitizeText(e.endDate || '')
        );
        this.education.push(
          this.fb.group({
            degree: [sanitizeText(e.degree || '')],
            institution: [sanitizeText(e.institution || '')],
            startDate: [dates.start],
            endDate: [dates.end],
          })
        );
      });
    } else {
      this.education.push(this.createEducationGroup());
    }
  }

  get experiencesArray(): FormArray {
    return this.experiences;
  }

  get educationArray(): FormArray {
    return this.education;
  }

  toggleSection(key: SectionKey): void {
    this.expanded.update((s) => ({ ...s, [key]: !s[key] }));
  }

  isExpanded(key: SectionKey): boolean {
    return this.expanded()[key];
  }

  createExperienceGroup() {
    return this.fb.group({
      title: [''],
      company: [''],
      startDate: [''],
      endDate: [''],
      description: [''],
    });
  }

  createEducationGroup() {
    return this.fb.group({
      institution: [''],
      degree: [''],
      startDate: [''],
      endDate: [''],
    });
  }

  addExperience(): void {
    this.experiences.push(this.createExperienceGroup());
    this.expanded.update((s) => ({ ...s, experiences: true }));
  }

  removeExperience(index: number): void {
    if (this.experiences.length > 1) {
      this.experiences.removeAt(index);
    }
  }

  addEducation(): void {
    this.education.push(this.createEducationGroup());
    this.expanded.update((s) => ({ ...s, education: true }));
  }

  removeEducation(index: number): void {
    if (this.education.length > 1) {
      this.education.removeAt(index);
    }
  }

  addSkill(): void {
    const tokens = normalizeSkills([this.skillInput().trim()]);
    if (!tokens.length) return;
    this.skills.update((s) => {
      const next = [...s];
      for (const t of tokens) {
        if (!next.includes(t)) next.push(t);
      }
      return next.slice(0, 35);
    });
    this.skillInput.set('');
  }

  removeSkill(skill: string): void {
    this.skills.update((s) => s.filter((x) => x !== skill));
  }

  onApply(): void {
    const id = this.identityForm.getRawValue();
    const experiences: ExperienceBlock[] = this.experiences
      .getRawValue()
      .filter((e) => e.title?.trim() || e.company?.trim())
      .map((e) => ({
        title: sanitizeText(e.title || '') || undefined,
        company: sanitizeText(e.company || '') || undefined,
        startDate: sanitizeText(e.startDate || '') || undefined,
        endDate: sanitizeText(e.endDate || '') || undefined,
        description: sanitizeText(e.description || '') || undefined,
      }));

    const education: EducationBlock[] = this.education
      .getRawValue()
      .filter((e) => e.institution?.trim() || e.degree?.trim())
      .map((e) => ({
        institution: sanitizeText(e.institution || '') || undefined,
        degree: sanitizeText(e.degree || '') || undefined,
        startDate: sanitizeText(e.startDate || '') || undefined,
        endDate: sanitizeText(e.endDate || '') || undefined,
      }));

    this.apply.emit({
      ...this.data(),
      first_name: id.firstName || null,
      last_name: id.lastName || null,
      phone: id.phone || null,
      professional_title: id.professionalTitle || null,
      bio: id.bio?.trim() || null,
      skills: this.skills(),
      experiences,
      education,
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  parserLabel(): string {
    const mode = this.data().parserMode;
    if (mode === 'ai-openai') return 'OpenAI';
    if (mode === 'ai-ollama') return 'Ollama (local)';
    if (mode?.startsWith('ai')) return 'IA';
    return 'Automatique';
  }

  parserBadgeClass(): string {
    const mode = this.data().parserMode;
    if (mode === 'ai-ollama') return 'cv-badge cv-badge--ollama';
    if (mode?.startsWith('ai')) return 'cv-badge cv-badge--ai';
    return 'cv-badge cv-badge--basic';
  }
}

function sanitizeText(value: string): string {
  return value
    .replace(/\uFFFD/g, '')
    .replace(/M\s*crosoft/gi, 'Microsoft')
    .replace(/Offce/gi, 'Office')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitDateRange(start: string, end: string): { start: string; end: string } {
  if (!start || end) {
    return { start: start || '', end: end || '' };
  }
  const range = start.match(/^((?:19|20)\d{2})\s*[-–—/]\s*(.+)$/);
  if (!range) {
    return { start, end };
  }
  const rest = range[2].trim();
  if (/^(?:19|20)\d{2}$/.test(rest)) {
    return { start: range[1], end: rest };
  }
  if (/présent|present|actuel|en cours|aujourd/i.test(rest)) {
    return { start: range[1], end: '' };
  }
  return { start: range[1], end: rest };
}

function normalizeSkills(skills: string[]): string[] {
  const out: string[] = [];
  for (const raw of skills) {
    for (const token of expandSkillToken(raw)) {
      const clean = sanitizeText(token);
      if (clean.length >= 2 && clean.length <= 48 && !out.includes(clean)) {
        out.push(clean);
      }
    }
  }
  return out.slice(0, 35);
}

function expandSkillToken(token: string): string[] {
  const t = sanitizeText(token);
  if (!t) return [];

  if (t.includes(':') && t.length < 60) {
    const idx = t.indexOf(':');
    const label = t.slice(0, idx).trim();
    const rest = t.slice(idx + 1).trim();
    const sub = rest.split(/[,;/|]/).map((s) => s.trim()).filter((s) => s.length >= 2);
    if (sub.length > 1) {
      return sub.map((s) => (label ? `${label} — ${s}` : s));
    }
  }

  const parts = t.split(/[,;/|]/).map((s) => s.trim()).filter((s) => s.length >= 2);
  return parts.length ? parts : [t];
}
