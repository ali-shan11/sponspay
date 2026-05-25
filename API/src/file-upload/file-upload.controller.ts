import {
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiSecurityProfile,
  ApiSecureEndpoint,
  ApiCommonResponses,
} from '../decorators/api-security-docs.decorator';
import { FileUploadService } from './file-upload.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@ApiTags('common')
@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post('photos')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload photos to Google Cloud Storage',
    description:
      ApiSecurityProfile({
        auth: 'Firebase JWT',
        authLocation: 'Authorization Bearer header',
        authorization: 'Any authenticated user',
        rateLimit: '5 requests per minute',
        dataSensitivity: 'Sensitive',
        auditLogging: 'No',
        securityConsiderations: [
          'Max 10MB per file',
          'Files uploaded to Google Cloud Storage',
          'Allowed formats: JPEG, PNG, GIF, WebP, SVG, AVIF, BMP, TIFF',
          'Client-side compression recommended before upload',
          'File type and size validation enforced',
        ],
        commonErrors: {
          '401': 'Missing or invalid Firebase JWT token',
          '422': 'File validation failed - check size or type',
          '429': 'Rate limit exceeded - Maximum 5 requests per minute',
          '500': 'Upload to Google Cloud Storage failed',
        },
      }) +
      '\n\n' +
      'Upload one or more photos to Google Cloud Storage. Allowed types: JPEG, PNG, GIF, WebP, SVG, AVIF, BMP, TIFF. Max size per file: 10MB. Client-side compression is strongly encouraged!',
  })
  @ApiResponse({
    status: 200,
    description: 'Photos uploaded successfully',
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - File validation failed (size or type)',
  })
  @ApiSecureEndpoint({
    auth: 'firebase-jwt',
    rateLimit: '5 requests per minute',
  })
  @ApiCommonResponses()
  uploadPhoto(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 1024 * 1024 * 10,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    files: Array<Express.Multer.File>,
  ) {
    this.fileUploadService.uploadPhotosToGCS(files, 'test');
  }
}
