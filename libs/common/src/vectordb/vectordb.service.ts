import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import { VECTORDB_CLIENT } from './vectordb.constants';

export type PineconeRecord = {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
};

@Injectable()
export class VectordbService {
  private readonly logger = new Logger(VectordbService.name);

  constructor(
    @Inject(VECTORDB_CLIENT) private readonly pineconeClient: Pinecone,
  ) {}

  async ensureIndex(indexName: string, dimension: number) {
    const indexes = await this.pineconeClient.listIndexes();
    const exists = indexes.indexes?.some((i) => i.name === indexName);
    if (exists) {
      this.logger.log(`Pinecone index "${indexName}" already exists`);
      return;
    }

    this.logger.log(
      `Creating Pinecone index "${indexName}" with dimension ${dimension}`,
    );
    await this.pineconeClient.createIndex({
      name: indexName,
      dimension,
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-west-1',
        },
      },
      waitUntilReady: true,
      suppressConflicts: true,
    });
  }

  async upsertVectors(indexName: string, records: PineconeRecord[]) {
    const index = this.pineconeClient.index(indexName);

    return index.upsert(records as any[]);
  }

  async query(
    indexName: string,
    queryVector: number[],
    options: { topK?: number; includeMetadata?: boolean } = {},
  ) {
    const index = this.pineconeClient.index(indexName);
    return index.query({
      vector: queryVector,
      topK: options.topK ?? 5,
      includeMetadata: options.includeMetadata ?? false,
    });
  }
}
