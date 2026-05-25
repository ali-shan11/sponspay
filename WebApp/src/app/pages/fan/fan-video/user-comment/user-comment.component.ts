import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { RecentComment } from '@app-types/fan';

export interface DisplayComment extends RecentComment {
  parent?: RecentComment | null;
}

@Component({
  selector: 'app-user-comment',
  imports: [CommonModule],
  templateUrl: './user-comment.component.html',
  styleUrl: './user-comment.component.scss',
})
export class UserCommentComponent implements OnChanges {
  @Input() commentList: RecentComment[] | null | undefined = [];
  @Input() creatorName!: string;
  public elementRef = inject(ElementRef);

  public displayList: DisplayComment[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if ('commentList' in changes) {
      this.rebuildDisplayList();
    }
  }

  private rebuildDisplayList(): void {
    const list = this.commentList ?? [];
    const byId = new Map<string, RecentComment>();
    for (const c of list) {
      if (c.telegramMessageId) byId.set(c.telegramMessageId, c);
    }

    this.displayList = list.map((c) => {
      const parent =
        c.replyToMessageId && byId.get(c.replyToMessageId)
          ? byId.get(c.replyToMessageId) ?? null
          : null;
      return { ...c, parent };
    });
  }

  isCreator(c: RecentComment): boolean {
    return c.senderType === 'creator';
  }

  displayName(c: RecentComment): string {
    return this.isCreator(c) ? this.creatorName : c.payerFullName;
  }

  formatRelativeTime(iso: string | undefined | null): string {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  parentPreview(parent: RecentComment | null | undefined): string {
    if (!parent) return '';
    const name = this.isCreator(parent)
      ? this.creatorName || 'Creator'
      : parent.payerFullName || 'Fan';
    const snippet = (parent.content || '').replace(/\s+/g, ' ').trim();
    const truncated =
      snippet.length > 80 ? snippet.slice(0, 80).trim() + '…' : snippet;
    return truncated ? `${name}: ${truncated}` : name;
  }

  openVideo(videoId: string | null | undefined): void {
    if (!videoId) return;
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  }
}
