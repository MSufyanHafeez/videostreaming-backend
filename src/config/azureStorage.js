const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'media';

let blobServiceClient;
let containerClient;

if (connectionString) {
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
    console.log(`[Azure Blob Storage]: Initialized for container '${containerName}'`);
  } catch (err) {
    console.error('[Azure Blob Storage Error]: Initialization failed -', err.message);
  }
} else {
  console.warn('[Azure Blob Storage Warning]: AZURE_STORAGE_CONNECTION_STRING missing in environment.');
}

/**
 * Uploads a file buffer to Azure Blob Storage container
 * @param {Buffer} fileBuffer 
 * @param {string} originalName 
 * @param {string} mimeType 
 * @returns {Promise<string>} Public Blob URL
 */
const uploadToAzureBlob = async (fileBuffer, originalName, mimeType) => {
  if (!containerClient) {
    throw new Error('Azure Blob Storage is not properly configured.');
  }

  // Ensure container exists
  await containerClient.createIfNotExists({ access: 'blob' });

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(originalName) || (mimeType.startsWith('video/') ? '.mp4' : '.jpg');
  const blobName = `uploads/${uniqueSuffix}${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(fileBuffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  console.log(`[Azure Blob Storage]: File uploaded successfully to ${blockBlobClient.url}`);
  return blockBlobClient.url;
};

module.exports = {
  blobServiceClient,
  containerClient,
  uploadToAzureBlob,
};
