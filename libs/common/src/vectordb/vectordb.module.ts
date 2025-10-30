import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { VectordbService } from './vectordb.service';
import { VECTORDB_CLIENT } from './vectordb.constants';
@Module({})
export class VectordbModule {
  static forRoot(): DynamicModule {
    return {
      module: VectordbModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: VECTORDB_CLIENT,
          useFactory: (configService: ConfigService) => {
            const apiKey = configService.get<string>('PINECONE_API_KEY');

            if (!apiKey) {
              throw new Error('Pinecone API key is not defined');
            }

            const client = new Pinecone({
              apiKey,
            });
            return client;
          },
          inject: [ConfigService],
        },
        VectordbService,
      ],
      exports: [VectordbService],
    };
  }
}
