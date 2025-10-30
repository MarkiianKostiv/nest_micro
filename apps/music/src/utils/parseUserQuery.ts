import { FindSongOrAuthorDto } from '../dto/findSongOrAuthor.dto';

export function parseUserQuery({
  query,
  systemPrompt,
}: {
  query: FindSongOrAuthorDto;
  systemPrompt: string;
}) {
  return [
    { role: 'system' as const, content: systemPrompt },
    ...query.messages.map((m) => ({
      role:
        m.type === 'current_message'
          ? ('user' as const)
          : ('assistant' as const),
      content: m.query,
    })),
  ];
}
