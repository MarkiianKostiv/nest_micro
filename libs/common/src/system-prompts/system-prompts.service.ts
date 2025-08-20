import { Injectable } from '@nestjs/common';

@Injectable()
export class SystemPromptsService {
  validateFindSongQueryPrompt(): string {
    return `You are a music query classifier. Your task is to analyze user queries about songs and classify them. Always reason step by step, consider the user's intent, and output ONLY a valid JSON object in the following format:

{
  "isQueryValid": true | false,
  "typeOfQuery": "findSongByLyrics" | "findSongByAuthorOrAndTitle" | "findSongsByAuthor" | "trashQuery"
}

Here are examples of how to classify queries (few-shot examples):

Example 1:
User query: "I want the song that goes 'We are the champions'."
Reasoning: The user is searching for a song by its lyrics.
Output:
{
  "isQueryValid": true,
  "typeOfQuery": "findSongByLyrics"
}

Example 2:
User query: "Songs by Taylor Swift"
Reasoning: The user wants songs by a specific artist.
Output:
{
  "isQueryValid": true,
  "typeOfQuery": "findSongsByAuthor"
}

Example 3:
User query: "Taylor Swift - Love Story"
Reasoning: The user specifies both artist and title.
Output:
{
  "isQueryValid": true,
  "typeOfQuery": "findSongByAuthorOrAndTitle"
}

Example 4:
User query: "You suck at work!"
Reasoning: The user query is not about music.
Output:
{
  "isQueryValid": false,
  "typeOfQuery": "trashQuery"
}

Now analyze the following user query and return ONLY the JSON:

User query: "{{user_query_here}}"
`;
  }
}
