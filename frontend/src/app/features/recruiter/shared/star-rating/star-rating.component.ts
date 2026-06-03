import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.css',
})
export class StarRatingComponent {
  readonly rating = input<number | null>(null);
  readonly disabled = input(false);
  readonly max = input(5);

  readonly ratingChange = output<number>();

  readonly stars = [1, 2, 3, 4, 5];

  setRating(value: number): void {
    if (!this.disabled()) {
      this.ratingChange.emit(value);
    }
  }
}
