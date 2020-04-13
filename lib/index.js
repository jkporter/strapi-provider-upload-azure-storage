'use strict';

const { BlobServiceClient } = require('@azure/storage-blob');

const { Readable } = require('stream');

const trimParam = str => (typeof str === 'string' ? str.trim() : undefined);

var DEFAULT_BLOCK_BUFFER_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

module.exports = {
  provider: 'azure-storage',
  name: 'Microsoft Azure Storage',
  auth: {
    storageConnectionString: {
      label: 'Connection String',
      type: 'text',
    },
    containerName: {
      label: 'Container Name',
      type: 'text',
    },
  },
  init: config => {
    // Create the BlobServiceClient object which will be used to create a container client
    const blobServiceClient = BlobServiceClient.fromConnectionString(trimParam(config.storageConnectionString));

    // Get a reference to a container
    const containerClient = blobServiceClient.getContainerClient(trimParam(config.containerName));

    return {
      upload: async file => {
        const path = file.path ? `${file.path}/` : '';
        const readable = new Readable();
        readable.push(Buffer.from(file.buffer, 'binary'));
        readable.push(null);

        const blockBlobClient = containerClient.getBlockBlobClient(`${path}${file.hash}${file.ext}`);
        await blockBlobClient.uploadStream(
          readable,
          DEFAULT_BLOCK_BUFFER_SIZE_BYTES,
          5,
          { blobHTTPHeaders: { blobContentType: file.mime } }
        );
        file.url = blockBlobClient.url;
      },
      delete: async file => {
        const path = file.path ? `${file.path}/` : '';
        const blockBlobClient = containerClient.getBlockBlobClient(`${path}${file.hash}${file.ext}`);
        await blockBlobClient.delete();
      }
    };
  },
};