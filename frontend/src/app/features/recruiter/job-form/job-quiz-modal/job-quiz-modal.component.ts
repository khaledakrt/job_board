import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { cloneQuiz, JobQuiz, JobQuizQuestion } from '../../../../core/models/job-quiz.model';

@Component({
  selector: 'app-job-quiz-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './job-quiz-modal.component.html',
  styleUrl: './job-quiz-modal.component.css',
})
export class JobQuizModalComponent {
  readonly quiz = input.required<JobQuiz>();
  readonly generating = input(false);
  readonly errorMessage = input<string | null>(null);

  readonly generateAi = output<void>();
  readonly save = output<JobQuiz>();
  readonly cancel = output<void>();

  readonly draft = signal<JobQuiz | null>(null);

  constructor() {
    effect(() => {
      this.draft.set(cloneQuiz(this.quiz()));
    });
  }

  updateQuestionText(index: number, text: string): void {
    this.patchQuestion(index, (q) => ({ ...q, text }));
  }

  updateChoiceText(questionIndex: number, choiceIndex: number, text: string): void {
    this.patchQuestion(questionIndex, (q) => {
      const choices = q.choices.map((c, i) =>
        i === choiceIndex ? { ...c, text } : c
      );
      return { ...q, choices };
    });
  }

  setCorrectChoice(questionIndex: number, choiceIndex: number): void {
    this.patchQuestion(questionIndex, (q) => ({
      ...q,
      correctChoiceIndex: choiceIndex,
    }));
  }

  onSave(): void {
    const draft = this.draft();
    if (draft) this.save.emit(draft);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onGenerateAi(): void {
    this.generateAi.emit();
  }

  questions(): JobQuizQuestion[] {
    return this.draft()?.questions ?? [];
  }

  private patchQuestion(
    index: number,
    updater: (q: JobQuizQuestion) => JobQuizQuestion
  ): void {
    const draft = this.draft();
    if (!draft) return;
    const questions = draft.questions.map((q, i) =>
      i === index ? updater(q) : q
    );
    this.draft.set({ questions });
  }
}
