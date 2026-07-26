/**
 * Marketing copy carried over verbatim from the prototype. Kept in a module
 * rather than the database because it is versioned with the design, not edited
 * by staff (spec §6.1 allows either). Blog posts and team members *are*
 * database-backed — those are seeded.
 */

export const site = {
  name: "EverGrace",
  tagline: "Gentle martial arts for a stronger, steadier you",
  journal: "The Steady Path Journal",
  confidentialityFooter:
    "Confidential — member health data. Handle per HIPAA / PIPEDA policy.",
} as const;

export type Feature = {
  icon: string;
  kicker: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
};

export const features: Feature[] = [
  {
    icon: "⚖",
    kicker: "Move well",
    title: "Better balance",
    description:
      "Slow, controlled movements from Tai Chi and Qigong that steady your body and quiet the fear of falling.",
    ctaLabel: "Watch a sample",
    href: "/library",
  },
  {
    icon: "✿",
    kicker: "Stay safe",
    title: "Safety first",
    description:
      "A gentle health check tailors every session to your body — seated, supported, or free-standing.",
    ctaLabel: "Start your check-in",
    href: "/onboarding",
  },
  {
    icon: "♥",
    kicker: "Feel connected",
    title: "A gentle community",
    description:
      "Track your streak, note how you feel each day, and share quiet encouragement with others on the path.",
    ctaLabel: "See your dashboard",
    href: "/dashboard",
  },
];

export const testimonials = [
  {
    quote:
      "I feel steadier on my feet than I have in years. I actually trust my balance again.",
    attribution: "Member on rebuilding balance",
  },
  {
    quote:
      "The seated sessions meant I could start the very first day. Nothing felt out of reach.",
    attribution: "Member on starting from a chair",
  },
  {
    quote:
      "Ten quiet minutes each morning. My breathing is calmer and my mind is clearer.",
    attribution: "Member on a daily habit",
  },
];

export const aboutPillars = [
  {
    title: "Safety first, always",
    body: "Every session is gated behind a health check and matched to your body — seated, supported, or standing.",
  },
  {
    title: "Accessible by design",
    body: "Large text, big buttons, captions, and read-aloud — built to WCAG standards so no one is left behind.",
  },
  {
    title: "Progress, not competition",
    body: "We celebrate consistency over speed, and connection over competition. Progress at your own pace.",
  },
];

export const healthQuestions = [
  {
    key: "mobility",
    text: "How do you prefer to exercise right now?",
    options: [
      { value: "seated", label: "Seated in a chair" },
      { value: "supported", label: "Standing, with a wall or chair for support" },
      { value: "free", label: "Freely standing on my own" },
    ],
  },
  {
    key: "surgery",
    text: "Have you had surgery or a fall in the last 3 months?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "dizzy",
    text: "Do you feel dizzy or short of breath with light activity?",
    options: [
      { value: "often", label: "Often" },
      { value: "sometimes", label: "Sometimes" },
      { value: "rarely", label: "Rarely or never" },
    ],
  },
  {
    key: "joints",
    text: "Any joint pain that limits your movement?",
    options: [
      { value: "significant", label: "Yes, it limits me a lot" },
      { value: "little", label: "A little" },
      { value: "none", label: "No" },
    ],
  },
] as const;

export type HealthQuestion = (typeof healthQuestions)[number];
