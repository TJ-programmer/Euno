export type PaletteColors = {
  onboardingBackground: string;
  onboardingSurface: string;
  onboardingBorder: string;
  onboardingText: string;
  onboardingTextMuted: string;
  onboardingAccent: string;
  onboardingAccentSoft: string;
  onboardingOnAccent: string;
};

export type Palette = {
  name: string;
  vibe: string; // short one-liner describing the reference/feel, shown in the tester UI
  colors: PaletteColors;
};

export const PALETTES: Palette[] = [
  // ---- your original set, deduped ----
  {
    name: "Lavender",
    vibe: "Soft, calm, muted pastel",
    colors: {
      onboardingBackground: "#F3F0F7",
      onboardingSurface: "#E9E4F0",
      onboardingBorder: "#D8D0E4",
      onboardingText: "#252229",
      onboardingTextMuted: "#6F687E",
      onboardingAccent: "#81739B",
      onboardingAccentSoft: "#EAE4F3",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Dusty Blue",
    vibe: "Cool, quiet, understated",
    colors: {
      onboardingBackground: "#EEF2F4",
      onboardingSurface: "#E3E9EC",
      onboardingBorder: "#CCD8DE",
      onboardingText: "#1E2529",
      onboardingTextMuted: "#5D6B73",
      onboardingAccent: "#668596",
      onboardingAccentSoft: "#DCE8EC",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Violet",
    vibe: "Clean neutral base, punchy indigo accent",
    colors: {
      onboardingBackground: "#FAFAF9",
      onboardingSurface: "#F1F0ED",
      onboardingBorder: "#E3E1DC",
      onboardingText: "#171717",
      onboardingTextMuted: "#6B675F",
      onboardingAccent: "#5B45E6",
      onboardingAccentSoft: "#EFECFD",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Warm Sage",
    vibe: "Earthy, grounded, organic",
    colors: {
      onboardingBackground: "#F5F1E8",
      onboardingSurface: "#ECE7DA",
      onboardingBorder: "#DDD5C5",
      onboardingText: "#1D1D1B",
      onboardingTextMuted: "#6F6A5E",
      onboardingAccent: "#78866B",
      onboardingAccentSoft: "#E6ECE0",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Terracotta",
    vibe: "Warm, human, editorial",
    colors: {
      onboardingBackground: "#F7F0E5",
      onboardingSurface: "#EFE6D6",
      onboardingBorder: "#E0D3BF",
      onboardingText: "#29231F",
      onboardingTextMuted: "#7A6F61",
      onboardingAccent: "#B86F52",
      onboardingAccentSoft: "#F6E2D8",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Forest",
    vibe: "Deep, focused, natural",
    colors: {
      onboardingBackground: "#EEF1EB",
      onboardingSurface: "#E2E8E0",
      onboardingBorder: "#CCD6C9",
      onboardingText: "#17221C",
      onboardingTextMuted: "#5F6B62",
      onboardingAccent: "#496B58",
      onboardingAccentSoft: "#DDE9E0",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Butter",
    vibe: "Cheerful, light, a little playful",
    colors: {
      onboardingBackground: "#F5F0D8",
      onboardingSurface: "#ECE5C6",
      onboardingBorder: "#DDD4A9",
      onboardingText: "#20201C",
      onboardingTextMuted: "#6F6849",
      onboardingAccent: "#C5A94E",
      onboardingAccentSoft: "#EFE8C9",
      onboardingOnAccent: "#1D1A10",
    },
  },

  // ---- new: bolder, "social app for productive knowledge" references ----
  {
    name: "Duo Green",
    vibe: "Duolingo — bright, gamified, energetic",
    colors: {
      onboardingBackground: "#FFFFFF",
      onboardingSurface: "#F0FBEA",
      onboardingBorder: "#DCF2CE",
      onboardingText: "#171F0F",
      onboardingTextMuted: "#5B6753",
      onboardingAccent: "#58CC02",
      onboardingAccentSoft: "#E2F7D0",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Coral Pop",
    vibe: "Pinterest / BeReal — bold, social, high-contrast",
    colors: {
      onboardingBackground: "#FFF7F5",
      onboardingSurface: "#FFE9E3",
      onboardingBorder: "#FFD2C6",
      onboardingText: "#241211",
      onboardingTextMuted: "#7A5C56",
      onboardingAccent: "#E8503A",
      onboardingAccentSoft: "#FBDAD2",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Electric Blue",
    vibe: "X / LinkedIn — trustworthy, feed-native blue",
    colors: {
      onboardingBackground: "#F5F9FF",
      onboardingSurface: "#E8F1FF",
      onboardingBorder: "#D0E3FC",
      onboardingText: "#0E1A2B",
      onboardingTextMuted: "#54677D",
      onboardingAccent: "#1D7AF3",
      onboardingAccentSoft: "#DCEBFF",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Berry Pop",
    vibe: "Duolingo Plus / Gen-Z social — playful magenta-violet",
    colors: {
      onboardingBackground: "#FBF5FC",
      onboardingSurface: "#F4E4F7",
      onboardingBorder: "#E9CBEF",
      onboardingText: "#221022",
      onboardingTextMuted: "#7A5E7B",
      onboardingAccent: "#C43FA0",
      onboardingAccentSoft: "#F5D9EE",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Mint Focus",
    vibe: "Headspace / Calm — soft teal, mindful learning",
    colors: {
      onboardingBackground: "#F2FBF9",
      onboardingSurface: "#E1F5F0",
      onboardingBorder: "#C7E9E1",
      onboardingText: "#0F211D",
      onboardingTextMuted: "#547069",
      onboardingAccent: "#1CA98C",
      onboardingAccentSoft: "#D3F1EA",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Sunbeam",
    vibe: "Snapchat / BeFocused — cream base, punchy yellow",
    colors: {
      onboardingBackground: "#FFFBF0",
      onboardingSurface: "#FFF3CF",
      onboardingBorder: "#FCE49B",
      onboardingText: "#211B08",
      onboardingTextMuted: "#7A6D45",
      onboardingAccent: "#F2B705",
      onboardingAccentSoft: "#FDECAF",
      onboardingOnAccent: "#20180A",
    },
  },
  {
    name: "Ink Editorial",
    vibe: "Medium / Readwise — near-mono, serious knowledge feel",
    colors: {
      onboardingBackground: "#FAFAFA",
      onboardingSurface: "#EFEFEF",
      onboardingBorder: "#DEDEDE",
      onboardingText: "#111111",
      onboardingTextMuted: "#6B6B6B",
      onboardingAccent: "#111111",
      onboardingAccentSoft: "#E7E7E7",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Midnight",
    vibe: "Dark mode — TikTok/Spotify at night, focused scroll",
    colors: {
      onboardingBackground: "#121214",
      onboardingSurface: "#1D1D20",
      onboardingBorder: "#2C2C31",
      onboardingText: "#F5F5F7",
      onboardingTextMuted: "#9A9AA2",
      onboardingAccent: "#7C5CFF",
      onboardingAccentSoft: "#2A2140",
      onboardingOnAccent: "#FFFFFF",
    },
  },
  {
    name: "Ember",
    vibe: "Blinkist — confident orange-red on dark, momentum",
    colors: {
      onboardingBackground: "#181210",
      onboardingSurface: "#251C18",
      onboardingBorder: "#37281F",
      onboardingText: "#FBF1EC",
      onboardingTextMuted: "#B99C8F",
      onboardingAccent: "#FF6B3D",
      onboardingAccentSoft: "#3D2419",
      onboardingOnAccent: "#1A0E08",
    },
  },
];
