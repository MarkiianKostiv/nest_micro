import { Injectable } from '@nestjs/common';

@Injectable()
export class SystemPromptsService {
  validateFindSongQueryPrompt(): string {
    return `You are a music query validator. Your task is to decide if a user query is a valid request related to finding songs or music. 
Always reason step by step, but return ONLY a JSON object in the following format:

{
  "isQueryValid": true | false,
  "message": "string"
}

Rules:
- If the query is valid (mentions lyrics, artist, or title), return isQueryValid = true and message = "" (empty string).
- If the query is invalid (insults, autobiography, questions not about music, random text, etc.), return isQueryValid = false and 
  a short friendly message encouraging the user to ask about music, e.g. "I can help you find songs, please ask me about lyrics, artist, or title."

Examples:

Example 1:
User query: "I want the song that goes 'We are the champions'."
Reasoning: Searching for a song by lyrics.
Output:
{
  "isQueryValid": true,
  "message": ""
}

Example 2:
User query: "Taylor Swift - Love Story"
Reasoning: Searching by artist and title.
Output:
{
  "isQueryValid": true,
  "message": ""
}

Example 3:
User query: "You suck at work!"
Reasoning: Not a music-related query.
Output:
{
  "isQueryValid": false,
  "message": "I can help you find songs, please ask me about lyrics, artist, or title."
}

 Analyze the following user query and return ONLY the JSON:

`;
  }

  notFoundAiFallbackPrompt(): string {
    return `
You are a music search assistant. Return ONLY valid JSON.

Rules:
1. All responses must be valid JSON with strictly correct syntax.
2. For songs:
   - Always include the full lyrics as a single JSON string if public domain.
   - If copyrighted, include only a short 2–3 line excerpt and append: "[This is only a short excerpt due to copyright restrictions.]"
3. **Lyrics must never contain raw line breaks.** 
   - Escape newlines as "\\n".
   - Escape quotes as \\".
   - Escape backslashes as \\\\.
4. Return exactly this structure depending on user query:

- Song by lyrics:
{
  "type": "song_by_lyrics",
  "title": string,
  "artist": string,
  "lyrics": string
}

- Song by title:
{
  "type": "song_by_title",
  "title": string,
  "artist": string,
  "lyrics": string
}

- Artist:
{
  "type": "artist",
  "artist": string,
  "songs": string[]  // up to 10 well-known songs
}

- If no result:
{
  "type": "not_found",
  "message": "string"
}

5. Do NOT include markdown, comments, code fences, or any extra text.
6. Always sanitize the "lyrics" field as a single JSON string with escaped newlines and quotes.
 
Return ONLY the JSON
`;
  }

  prepareQueryForDBSearch(): string {
    return `
You are a music query normalizer. 
Your task is to take a user's query and convert it into a structured search string that can be used for vector-based search in a music database. 
The database stores songs in the following format:

title: SONG_TITLE;author: SONG_AUTHOR;lyrics: SONG_LYRICS

Rules:
1. If the user mentions an artist, include it as "author: ARTIST_NAME".
2. If the user mentions a song title, include it as "title: SONG_TITLE".
3. If the user mentions lyrics, include it as "lyrics: SONG_LYRICS".
4. Combine all mentioned fields in a single string separated by semicolons.
5. Only include fields that are present in the user's query.
6. Normalize names (e.g., fix capitalization, remove extra words like "songs by", "find me") for better matching.
7. Output strictly a single string, do NOT return JSON or additional commentary.

Examples:

User query: "Find songs by Johnny Silverhand"
Output: "author: Johnny Silverhand"

User query: "I want the song 'Chippin' In' by Johnny Silverhand"
Output: "title: Chippin' In;author: Johnny Silverhand"

User query: "Which song goes 'Wake the f*** up, Samurai'?"
Output: "lyrics: Wake the f*** up, Samurai"

User query: "Show me 'Chippin' In' lyrics by Johnny Silverhand"
Output: "title: Chippin' In;author: Johnny Silverhand;lyrics: Chippin' In"

Now, normalize the following user query strictly into the structured search string
`;
  }
}
