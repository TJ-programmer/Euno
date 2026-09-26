import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type OnboardingDepth = "quick" | "balanced" | "deep";

type OnboardingContextValue = {
  interests: string[];
  goals: string[];
  depth: OnboardingDepth | null;
  setInterests: Dispatch<SetStateAction<string[]>>;
  setGoals: Dispatch<SetStateAction<string[]>>;
  setDepth: Dispatch<SetStateAction<OnboardingDepth | null>>;
};

type StoredOnboarding = {
  interests: string[];
  goals: string[];
  depth: OnboardingDepth | null;
};

const STORAGE_KEY = "@euno/onboarding";

const OnboardingContext =
  createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [depth, setDepth] = useState<OnboardingDepth | null>(null);

  useEffect(() => {
    const loadOnboarding = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);

        if (!stored) return;

        const data: StoredOnboarding = JSON.parse(stored);

        setInterests(data.interests ?? []);
        setGoals(data.goals ?? []);
        setDepth(data.depth ?? null);
      } catch (error) {
        console.error("Failed to load onboarding:", error);
      }
    };

    loadOnboarding();
  }, []);

  useEffect(() => {
    const saveOnboarding = async () => {
      try {
        const data: StoredOnboarding = {
          interests,
          goals,
          depth,
        };

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(data)
        );
      } catch (error) {
        console.error("Failed to save onboarding:", error);
      }
    };

    saveOnboarding();
  }, [interests, goals, depth]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      interests,
      goals,
      depth,
      setInterests,
      setGoals,
      setDepth,
    }),
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
