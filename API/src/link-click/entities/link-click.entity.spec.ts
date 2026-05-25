import { LinkClick } from './link-click.entity';

describe('LinkClick Entity', () => {
  it('should create a LinkClick instance', () => {
    const click = new LinkClick();
    expect(click).toBeInstanceOf(LinkClick);
  });

  it('should have telegramChannel and createdAt fields', () => {
    const click = new LinkClick();
    click.telegramChannel = { id: 1 } as any;
    click.createdAt = new Date();
    expect(click.telegramChannel).toEqual({ id: 1 });
    expect(click.createdAt).toBeInstanceOf(Date);
  });
});
