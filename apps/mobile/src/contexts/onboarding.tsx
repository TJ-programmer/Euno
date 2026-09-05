import React, { createContext, useContext, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type OnboardingDepth = "quick" | "balanced" | "deep";

type OnboardingContextValue = {
  interests: string[];
  goals: string[];
  depth: OnboardingDepth | null;
  setInterests: Dispatch<SetStateAction<string[]>>;
  setGoals: Dispatch<SetStateAction<string[]>>;
  setDepth: Dispatch<SetStateAction<OnboardingDepth | null>>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [depth, setDepth] = useState<OnboardingDepth | null>(null);

  const value = useMemo<OnboardingContextValue>(
    () => ({ interests, goals, depth, setInterests, setGoals, setDepth }),
    [interests, goals, depth]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (context === null) {
    throw new Error(
      "useOnboarding must be used within an OnboardingProvider"
    );
  }
  return context;
}