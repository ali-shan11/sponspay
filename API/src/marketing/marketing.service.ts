import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull, Repository } from 'typeorm';
import { ContactUsDTO } from './dto/contact-us.dto';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
import { CountryMarketDataDto } from './dto/country-market-data.dto';
import { News } from './entities/news.entity';
import { Country } from '../transaction/entities/country.entity';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { ZohoService } from '../zoho/zoho.service';
import { ContactUs } from './entities/contact-us.entity';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    @InjectRepository(News)
    private readonly newsRepository: Repository<News>,
    @InjectRepository(ContactUs)
    private readonly contactUsRepository: Repository<ContactUs>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly zohoService: ZohoService,
  ) {}

  async processContactUsRequest(payload: ContactUsDTO) {
    // Save to database
    await this.contactUsRepository.save(payload);

    // Send email notification
    await this.mailService.sendEmail({
      to: this.configService.get<string>('CONTACT_US_EMAIL')!,
      from: this.configService.get<string>('FROM_EMAIL')!,
      subject: 'Contact us form submitted',
      html: `<h1>A new contact us form submission</h1>
        <p>Name: ${payload.firstName} ${payload.lastName}</p>
        <p>Email: ${payload.email}</p>
        <p>Interest: ${payload.interest}</p>
        <p>Country: ${payload.country}</p>
        ${payload.phoneNumber ? `<p>Phone: ${payload.phoneNumber}</p>` : ''}
        <p>Message: ${payload.message}</p>`,
    });

    // Create lead in Zoho CRM (non-blocking)
    this.createZohoLead(payload);
  }

  private async createZohoLead(payload: ContactUsDTO): Promise<void> {
    try {
      await this.zohoService.createContactAndPromoteToLead(payload);
      this.logger.log(
        `Successfully created Zoho contact and promoted to lead for ${payload.email}`,
      );
    } catch (error) {
      // Log error but don't fail the main flow
      this.logger.error(
        `Failed to create Zoho contact and lead for ${payload.email}`,
        error,
      );
    }
  }

  async createNews(createNewsDto: CreateNewsDto): Promise<News> {
    const news = this.newsRepository.create(createNewsDto);
    return this.newsRepository.save(news);
  }

  async getLatestNews(count: number): Promise<News[]> {
    return this.newsRepository.find({
      where: { deletedAt: undefined },
      order: { createdAt: 'DESC' },
      take: count,
    });
  }

  async updateNews(id: string, updateNewsDto: UpdateNewsDto): Promise<News> {
    const news = await this.newsRepository.preload({
      id,
      ...updateNewsDto,
    });
    if (!news) {
      throw new NotFoundException(`News with ID "${id}" not found`);
    }
    return this.newsRepository.save(news);
  }

  async softDeleteNews(id: string): Promise<void> {
    const result = await this.newsRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`News with ID "${id}" not found`);
    }
  }

  async getCountryMarketData(): Promise<CountryMarketDataDto[]> {
    const countries = await this.countryRepository.find({
      where: {
        creditCardPenetration: Not(IsNull()),
        mobilePenetration: Not(IsNull()),
        iso2Code: Not(IsNull()),
      },
      order: { name: 'ASC' },
    });

    return countries.map((c) => ({
      iso3Code: c.iso3Code,
      iso2Code: c.iso2Code!,
      name: c.name,
      creditCardPenetration: Number(c.creditCardPenetration),
      mobilePenetration: Number(c.mobilePenetration),
    }));
  }

  async getLandingPageDetails() {
    const totalRevenue = Math.floor(Math.random() * 10000000000) + 1;
    const growth = Math.floor(Math.random() * 100) + 1;
    const countriesSupported = 19;
    const transactions = Math.floor(Math.random() * 10000000000) + 1;

    const avatarUrls = [
      'https://i.pravatar.cc/150?img=1',
      'https://i.pravatar.cc/150?img=2',
      'https://i.pravatar.cc/150?img=3',
      'https://i.pravatar.cc/150?img=4',
    ];

    const numUsers = Math.floor(Math.random() * 4) + 1;
    const users = Array.from({ length: numUsers }, (_, i) => ({
      avatar: avatarUrls[i],
    }));

    return {
      totalRevenue,
      growth,
      countriesSupported,
      transactions,
      users,
    };
  }
}
