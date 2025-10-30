import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { embed, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { FindSongOrAuthorDto } from './dto/findSongOrAuthor.dto';
import { SystemPromptsService } from '@app/common/system-prompts/system-prompts.service';
import { VectordbService } from '@app/common/vectordb/vectordb.service';
import { AiFallbackResponse } from './interfaces/ai-fallback-response.interface';
import { parseUserQuery } from './utils/parseUserQuery';

@Injectable()
export class MusicService {
  constructor(
    private readonly configService: ConfigService,
    private readonly systemPrompts: SystemPromptsService,
    private readonly vectordbService: VectordbService,
  ) {}

  private async validateQuery(
    query: FindSongOrAuthorDto,
  ): Promise<{ isQueryValid: boolean; message: string }> {
    try {
      const systemPrompt = this.systemPrompts.validateFindSongQueryPrompt();

      const messages = parseUserQuery({ query, systemPrompt });

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        messages,
        temperature: 0,
      });

      try {
        const parsed = JSON.parse(text);
        return {
          isQueryValid: Boolean(parsed.isQueryValid),
          message:
            typeof parsed.message === 'string'
              ? parsed.message
              : 'I can help you find songs, please ask me about lyrics, artist, or title.',
        };
      } catch (e) {
        return {
          isQueryValid: false,
          message: 'Error processing your request. Please try again later.',
        };
      }
    } catch (err) {
      return {
        isQueryValid: false,
        message: 'Error processing your request. Please try again later.',
      };
    }
  }

  private async aiFallback(
    query: FindSongOrAuthorDto,
  ): Promise<AiFallbackResponse> {
    try {
      const systemPrompt = this.systemPrompts.notFoundAiFallbackPrompt();
      const messages = parseUserQuery({ query, systemPrompt });

      const response = await generateText({
        model: openai('gpt-4o-mini'),
        messages,
        temperature: 0,
      });

      const text = response.text
        .trim()
        .replace(/^```(json)?/, '')
        .replace(/```$/, '')
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/\n/g, ' ')
        .trim();

      try {
        const parsed = JSON.parse(text);

        if (parsed && typeof parsed.message === 'string') {
          return {
            message: parsed.message,
            ...(parsed.data ? { data: parsed.data } : {}),
          } as AiFallbackResponse;
        }

        if (parsed && parsed.type) {
          return parsed as AiFallbackResponse;
        }

        return {
          message: 'I could not parse AI fallback response.',
        } as AiFallbackResponse;
      } catch (err) {
        console.error('Error parsing AI response:', err);
        return {
          message: 'There was a problem parsing the AI response.',
        } as AiFallbackResponse;
      }
    } catch (error) {
      return {
        message: 'There was a problem processing your request.',
      };
    }
  }

  private async prepareQueryForDBSearch(query: FindSongOrAuthorDto) {
    const systemPrompt = this.systemPrompts.prepareQueryForDBSearch();
    const messages = parseUserQuery({ query, systemPrompt });

    const response = await generateText({
      model: openai('gpt-4o-mini'),
      messages,
      temperature: 0,
    });

    const normalizedQuery = response.text.trim();

    try {
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: normalizedQuery,
      });

      return {
        normalizedQuery,
        embedding,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to vectorize query: ' + error,
      );
    }
  }

  private async evaluateDBResults(normalizedQuery: string, matches: any[]) {
    const systemPrompt = this.systemPrompts.vectorDBEvaluationPrompt();

    const response = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Normalized search: "${normalizedQuery}" Vector matches: ${JSON.stringify(matches, null, 2)}`,
        },
      ],
    });

    try {
      const text = response.text.trim();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch {
      return {
        dbMatch: false,
        message: 'Parsing error in AI evaluation',
        matches: [],
      };
    }
  }

  async findSongOrAuthor(query: FindSongOrAuthorDto) {
    const { isQueryValid, message } = await this.validateQuery(query);

    console.log('Query validation result:', isQueryValid, query.messages);

    if (!isQueryValid) {
      return {
        isQueryValid,
        message,
      };
    }

    const { normalizedQuery, embedding } =
      await this.prepareQueryForDBSearch(query);

    const indexName =
      this.configService.get<string>('PINECONE_INDEX') || 'songs';
    const pineconeResults = await this.vectordbService.query(
      indexName,
      embedding,
      {
        topK: 10,
        includeMetadata: true,
      },
    );

    const aiEval = await this.evaluateDBResults(
      normalizedQuery,
      pineconeResults.matches,
    );

    console.log('AI Evaluation result:', aiEval.dbMatch);

    if (!aiEval.dbMatch) {
      const fallback = await this.aiFallback(query);
      console.log('AI Fallback response:', fallback);

      return {
        fromDB: false,
        message: fallback.message,
      };
    }

    return {
      fromDB: true,
      message: aiEval.message,
      matches: aiEval.matches,
    };
  }
}
