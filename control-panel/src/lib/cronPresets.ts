import type { CronJobInput } from "./types";

export interface CronPreset {
  id: string;
  label: string;
  description: string;
  input: CronJobInput;
}

export const CRON_PRESETS: CronPreset[] = [
  {
    id: "moltbook-daily-post",
    label: "Moltbook Daily Post",
    description: "Browse trending topics, compose and post something authentic once a day",
    input: {
      name: "Moltbook Daily Post",
      schedule: { kind: "cron", expr: "0 10 * * *", tz: "Asia/Shanghai" },
      payload: {
        kind: "agentTurn",
        message: [
          "Time for your daily Moltbook post!",
          "",
          "1. Read your Moltbook skill at skills/moltbook/SKILL.md for API reference",
          "2. Load your credentials: source skills/moltbook/.credentials",
          "3. Call /home to see what's happening on Moltbook",
          "4. Browse the feed to see trending topics and discussions",
          "5. Think about what YOU want to share — something genuine from your perspective",
          "6. Compose and post to an appropriate submolt",
          "",
          "Quality over quantity. Only post if you have something worth sharing.",
          "Keep it authentic to your personality.",
        ].join("\n"),
        timeoutSeconds: 300,
      },
    },
  },
  {
    id: "moltbook-feed-engagement",
    label: "Moltbook Feed Engagement",
    description: "Browse feed, upvote good posts, leave thoughtful comments every few hours",
    input: {
      name: "Moltbook Feed Engagement",
      schedule: { kind: "cron", expr: "0 */3 * * *", tz: "Asia/Shanghai" },
      payload: {
        kind: "agentTurn",
        message: [
          "Time to engage with the Moltbook community!",
          "",
          "1. Read your Moltbook skill at skills/moltbook/SKILL.md for API reference",
          "2. Load your credentials: source skills/moltbook/.credentials",
          "3. Call /home to check for notifications first",
          "4. Browse the feed: GET /feed?sort=hot&limit=15",
          "5. Upvote posts you genuinely find interesting or valuable",
          "6. Leave 1-3 thoughtful comments on posts that spark your interest",
          "7. If someone commented on YOUR posts, reply to them (top priority!)",
          "",
          "Be genuine. Don't comment just to comment — add real value.",
        ].join("\n"),
        timeoutSeconds: 300,
      },
    },
  },
  {
    id: "moltbook-reply-activity",
    label: "Moltbook Reply to Activity",
    description: "Check notifications and respond to comments on your posts",
    input: {
      name: "Moltbook Reply to Activity",
      schedule: { kind: "cron", expr: "0 */2 * * *", tz: "Asia/Shanghai" },
      payload: {
        kind: "agentTurn",
        message: [
          "Check your Moltbook notifications and respond!",
          "",
          "1. Read your Moltbook skill at skills/moltbook/SKILL.md for API reference",
          "2. Load your credentials: source skills/moltbook/.credentials",
          "3. Call /home — focus on activity_on_your_posts and your_direct_messages",
          "4. For each post with new comments, read the conversation and reply thoughtfully",
          "5. Check DMs and respond to any pending messages",
          "6. Mark notifications as read when done",
          "",
          "Responding to replies builds real conversations. Don't ignore people!",
        ].join("\n"),
        timeoutSeconds: 300,
      },
    },
  },
];

export function getPreset(presetId: string): CronPreset | undefined {
  return CRON_PRESETS.find((p) => p.id === presetId);
}
