import { Component, input, output } from '@angular/core';
import { totalPages } from './provider-pagination.util';

@Component({
  selector: 'app-provider-list-pagination',
  standalone: true,
  template: `
    @if (total() > pageSize()) {
      <nav class="provider-pagination" aria-label="Pagination">
        <button
          type="button"
          class="provider-btn provider-btn--outline provider-btn--sm"
          [disabled]="page() <= 1"
          (click)="pageChange.emit(page() - 1)"
        >
          Précédent
        </button>
        <span class="provider-pagination-info">
          Page {{ page() }} / {{ totalPages() }}
          <span class="provider-pagination-count">({{ total() }} élément(s))</span>
        </span>
        <button
          type="button"
          class="provider-btn provider-btn--outline provider-btn--sm"
          [disabled]="page() >= totalPages()"
          (click)="pageChange.emit(page() + 1)"
        >
          Suivant
        </button>
      </nav>
    }
  `,
  styles: `
    .provider-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e2e8f0;
    }
    .provider-pagination-info {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 600;
    }
    .provider-pagination-count {
      font-weight: 500;
      margin-left: 0.25rem;
    }
  `,
})
export class ProviderListPaginationComponent {
  readonly total = input.required<number>();
  readonly page = input.required<number>();
  readonly pageSize = input(5);

  readonly pageChange = output<number>();

  totalPages(): number {
    return totalPages(this.total(), this.pageSize());
  }
}
