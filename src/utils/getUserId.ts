import { Guild } from "discord.js";

export function getUserId(input: string, guild?: Guild | null): string | null {
  const match = input.match(/^\\?<@!?(\d+)>$|^\\?(\d+)$/);
  if (match) {
    return match[1] || match[2];
  }

  if (guild) {
    const member = guild.members.cache.find(
      (member) =>
        member.user.username.toLowerCase().includes(input.toLowerCase()) ||
        member.displayName.toLowerCase().includes(input.toLowerCase())
    );
    return member ? member.user.id : null;
  }

  return null;
}
