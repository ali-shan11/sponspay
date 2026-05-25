import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentComment } from '@app-types/fan';

import { UserCommentComponent } from './user-comment.component';

describe('UserCommentComponent', () => {
  let component: UserCommentComponent;
  let fixture: ComponentFixture<UserCommentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCommentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCommentComponent);
    component = fixture.componentInstance;
    component.creatorName = 'Scott D.';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders an empty displayList when commentList is undefined', () => {
    expect(component.displayList).toEqual([]);
  });

  it('pairs a creator reply with its parent fan message', () => {
    const comments: RecentComment[] = [
      {
        payerFullName: 'Filip',
        content: 'Great stream!',
        timestamp: '2025-01-01T00:00:00.000Z',
        senderType: 'paid',
        telegramMessageId: '1001',
        replyToMessageId: null,
      },
      {
        payerFullName: 'Creator',
        content: 'Thanks Filip!',
        timestamp: '2025-01-01T00:01:00.000Z',
        senderType: 'creator',
        telegramMessageId: '1002',
        replyToMessageId: '1001',
      },
    ];

    component.commentList = comments;
    component.ngOnChanges({
      commentList: {
        currentValue: comments,
        previousValue: [],
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.displayList.length).toBe(2);
    expect(component.displayList[0].parent).toBeNull();
    expect(component.displayList[1].parent?.telegramMessageId).toBe('1001');
  });

  it('returns null parent when replyToMessageId does not match any visible message', () => {
    const comments: RecentComment[] = [
      {
        payerFullName: 'Creator',
        content: 'Reply to a message not in the list',
        timestamp: '2025-01-01T00:01:00.000Z',
        senderType: 'creator',
        telegramMessageId: '999',
        replyToMessageId: '500',
      },
    ];

    component.commentList = comments;
    component.ngOnChanges({
      commentList: {
        currentValue: comments,
        previousValue: [],
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.displayList[0].parent).toBeNull();
  });

  describe('formatRelativeTime', () => {
    it('returns "just now" for timestamps under a minute', () => {
      const twentySecondsAgo = new Date(Date.now() - 20 * 1000).toISOString();
      expect(component.formatRelativeTime(twentySecondsAgo)).toBe('just now');
    });

    it('returns Nm ago for timestamps under an hour', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(component.formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('returns Nh ago for timestamps under a day', () => {
      const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60 * 1000,
      ).toISOString();
      expect(component.formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });

    it('returns empty string for null or undefined input', () => {
      expect(component.formatRelativeTime(null)).toBe('');
      expect(component.formatRelativeTime(undefined)).toBe('');
    });
  });

  describe('displayName', () => {
    it('uses creatorName for creator messages', () => {
      const c: RecentComment = {
        payerFullName: 'whatever',
        content: '',
        timestamp: '',
        senderType: 'creator',
      };
      expect(component.displayName(c)).toBe('Scott D.');
    });

    it('uses payerFullName for paid messages', () => {
      const c: RecentComment = {
        payerFullName: 'Filip',
        content: '',
        timestamp: '',
        senderType: 'paid',
      };
      expect(component.displayName(c)).toBe('Filip');
    });
  });

  describe('parentPreview', () => {
    it('returns creatorName + snippet for a creator parent', () => {
      const parent: RecentComment = {
        payerFullName: 'x',
        content: 'Here is my reply',
        timestamp: '',
        senderType: 'creator',
      };
      expect(component.parentPreview(parent)).toBe('Scott D.: Here is my reply');
    });

    it('truncates long snippets', () => {
      const parent: RecentComment = {
        payerFullName: 'Filip',
        content: 'a'.repeat(120),
        timestamp: '',
        senderType: 'paid',
      };
      const out = component.parentPreview(parent);
      expect(out.startsWith('Filip: ')).toBe(true);
      expect(out.endsWith('…')).toBe(true);
    });
  });
});
