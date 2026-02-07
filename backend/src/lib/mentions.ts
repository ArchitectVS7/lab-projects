import prisma from './prisma.js';
import { createNotification } from './notifications.js';

export function parseMentions(content: string): string[] {
  const matches = content.match(/@(\w+(?:\.\w+)*)/g);
  if (!matches) return [];
  // Remove the '@' prefix and deduplicate
  return [...new Set(matches.map((m) => m.slice(1)))];
}

export async function resolveMentions(names: string[], projectId: string) {
  if (names.length === 0) return [];

  // Get all project members
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  // Case-insensitive match by name (comparing with dots replaced by spaces too)
  const matched: { id: string; name: string }[] = [];
  for (const name of names) {
    const normalizedName = name.toLowerCase().replace(/\./g, ' ');
    const member = members.find(
      (m) =>
        m.user.name.toLowerCase() === normalizedName ||
        m.user.name.toLowerCase().replace(/\s+/g, '.') === name.toLowerCase()
    );
    if (member) {
      matched.push(member.user);
    }
  }

  return matched;
}

export async function notifyMentions(
  mentionedUsers: { id: string; name: string }[],
  authorId: string,
  authorName: string,
  taskId: string,
  taskTitle: string,
  projectId: string,
) {
  for (const user of mentionedUsers) {
    // Don't notify self-mentions
    if (user.id === authorId) continue;

    await createNotification({
      userId: user.id,
      type: 'MENTION',
      title: 'You were mentioned',
      message: `${authorName} mentioned you in a comment on "${taskTitle}"`,
      taskId,
      projectId,
    });
  }
}
