
import React, { useEffect } from "react";
import {
  View,
  Pressable,
  StyleSheet,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Home, Activity, User } from "lucide-react-native";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "react-native";

const ICONS: Record<string, any> = {
  home: Home,
  flow: Activity,
  you: User,
};

export default function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.onboardingBorder,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const Icon = ICONS[route.name] ?? Home;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabButton
            key={route.key}
            label={options.title ?? route.name}
            isFocused={isFocused}
            onPress={onPress}
            Icon={Icon}
            activeColor={theme.onboardingAccent}
            inactiveColor={theme.textSecondary}
          />
        );
      })}
    </View>
  );
}

function TabButton({
  label,
  isFocused,
  onPress,
  Icon,
  activeColor,
  inactiveColor,
}: {
  label: string;
  isFocused: boolean;
  onPress: () => void;
  Icon: any;
  activeColor: string;
  inactiveColor: string;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.15 : 1, {
      damping: 12,
      stiffness: 220,
      mass: 0.5,
    });
  }, [isFocused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabButton}
      hitSlop={8}
      android_ripple={{ color: "transparent" }}
    >
      {/* ONLY THE ICON IS ACTIVE */}
      <Animated.View style={iconStyle}>
        <Icon
          size={24}
          color={isFocused ? activeColor : inactiveColor}
          strokeWidth={isFocused ? 2.5 : 1.8}
          fill="transparent"
        />
      </Animated.View>

      {/* Label stays neutral */}
      <Animated.Text
        style={[
          styles.label,
          {
            color: inactiveColor,
          },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    height: 72,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 10,
  },

  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  label: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: "500",
  },
});

