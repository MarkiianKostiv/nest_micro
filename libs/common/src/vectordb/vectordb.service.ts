import { Inject, Injectable } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import { VECTORDB_CLIENT } from './vectordb.constants';

@Injectable()
export class VectordbService {
  constructor(
    @Inject(VECTORDB_CLIENT) private readonly pineconeClient: Pinecone,
  ) {}

  async upsert(indexName: string, vectors: any[]) {
    const index = this.pineconeClient.Index(indexName);
    return index.upsert(vectors);
  }

  async query(indexName: string, queryVector: number[], topK: number) {
    const index = this.pineconeClient.Index(indexName);
    return index.query({
      vector: queryVector,
      topK,
    });
  }
}
