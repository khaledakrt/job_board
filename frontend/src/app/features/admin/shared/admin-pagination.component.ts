import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { adminPageNumbers, adminPageSummary } from './admin-pagination.util';

@Component({
  selector: 'app-admin-pagination',
  standalone: true,
  templateUrl: './admin-pagination.component.html',
  styleUrl: './admin-pagination.component.css',
})
export class AdminPaginationComponent {
  @Input() pagination: PaginationMeta | null = null;
  @Input() loading = false;
  @Input() itemLabel = 'élément';

  @Output() pageChange = new EventEmitter<number>();

  summary(): string {
    return adminPageSummary(this.pagination, this.itemLabel);
  }

  pageNumbers(): number[] {
    return adminPageNumbers(this.pagination);
  }

  goTo(page: number): void {
    if (this.loading || !this.pagination) return;
    if (page < 1 || page > this.pagination.totalPages) return;
    this.pageChange.emit(page);
  }
}
