import AWS from 'aws-sdk';
import path from 'path';

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

// Company logos bucket configuration
const COMPANY_LOGOS_BUCKET = process.env.COMPANY_LOGOS_BUCKET || 'steel-company-logos';

// Upload company logo to S3
export const uploadCompanyLogo = async (fileBuffer: Buffer, fileName: string, mimeType: string, companyId: string): Promise<string> => {
  try {
    if (!fileBuffer || !fileName) {
      throw new Error('File buffer and filename are required');
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(fileName);
    const s3FileName = `company-logos/${companyId}/${uniqueSuffix}${fileExtension}`;

    const params = {
      Bucket: COMPANY_LOGOS_BUCKET,
      Key: s3FileName,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read',
    };

    const result = await s3.upload(params).promise();
    return result.Location; // Returns the public URL
  } catch (error) {
    console.error('Error uploading company logo:', error);
    throw new Error('Failed to upload company logo');
  }
};

// Delete company logo from S3
export const deleteCompanyLogo = async (logoUrl: string): Promise<void> => {
  try {
    if (!logoUrl) {
      return;
    }

    // Extract key from URL
    const key = logoUrl.split('.com/')[1];

    const params = {
      Bucket: COMPANY_LOGOS_BUCKET,
      Key: key,
    };

    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('Error deleting company logo:', error);
    throw new Error('Failed to delete company logo');
  }
};

// Get company logo URL
export const getCompanyLogoUrl = (key: string): string => {
  return `https://${COMPANY_LOGOS_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
};

// Multer S3 configuration for company logos (for future use)
export const companyLogoUpload = {
  bucket: COMPANY_LOGOS_BUCKET,
  maxSize: 5 * 1024 * 1024, // 5MB limit
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
};
