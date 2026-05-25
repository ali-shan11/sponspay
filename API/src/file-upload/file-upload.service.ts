import { Storage } from '@google-cloud/storage';
import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
  private storage: Storage;
  private readonly logger = new Logger(FileUploadService.name);

  constructor(private configService: ConfigService) {
    this.storage = new Storage({
      credentials: {
        client_email: this.configService.get<string>('SERVICE_ACCOUNT'),
        private_key: this.configService.get<string>(
          'SERVICE_ACCOUNT_PRIVATE_KEY',
        ),
        client_id: this.configService.get<string>('SERVICE_ACCOUNT_USER'),
      },
    });
  }

  async uploadPhotosToGCS(
    files: Express.Multer.File[],
    userId: string,
  ): Promise<string[]> {
    const bucketName = this.configService.get<string>('PHOTOS_BUCKET');
    const bucket = this.storage.bucket(bucketName!);
    const uploadedUrls = [];

    for (const file of files) {
      try {
        const fileExtension = this.getPhotoExtensionFromMimeType(file.mimetype);
        if (!fileExtension) {
          this.logger.error(`Unsupported file type: ${file.mimetype}`);
          continue;
        }

        const fileName = `${userId}-${uuidv4()}.${fileExtension}`;
        const blob = bucket.file(fileName);
        const blobStream = blob.createWriteStream({
          resumable: false,
          metadata: {
            contentType: file.mimetype,
          },
        });

        const url = await new Promise<string>((resolve, reject) => {
          blobStream.on('error', reject);
          blobStream.on('finish', () => {
            resolve(
              `https://storage.googleapis.com/${bucketName}/${blob.name}`,
            );
          });
          blobStream.end(file.buffer);
        });

        uploadedUrls.push(url);
      } catch (error) {
        this.logger.error(error);
      }
    }

    if (uploadedUrls.length === 0) {
      throw new UnprocessableEntityException('No files were uploaded.');
    }

    return uploadedUrls;
  }

  private getPhotoExtensionFromMimeType(mimeType: string): string | null {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpeg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      case 'image/svg+xml':
        return 'svg';
      case 'image/avif':
        return 'avif';
      case 'image/bmp':
        return 'bmp';
      case 'image/tiff':
        return 'tiff';
      default:
        return null;
    }
  }
}
