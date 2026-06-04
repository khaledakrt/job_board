import { Component, input } from '@angular/core';
import { ApplicationQuizReview } from '../../../core/models/application.model';

@Component({
  selector: 'app-application-quiz-review',
  standalone: true,
  templateUrl: './application-quiz-review.component.html',
  styleUrl: './application-quiz-review.component.css',
})
export class ApplicationQuizReviewComponent {
  readonly review = input.required<ApplicationQuizReview>();
  readonly showCorrectHints = input(true);
}
