import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, StyleProp, ViewStyle } from 'react-native'

import { useTheme } from '@/hooks/use-theme'

type Props = {
  style?: StyleProp<ViewStyle>
}

export function TypingIndicator({ style }: Props) {
  const theme = useTheme()
  const anim1 = useRef(new Animated.Value(0)).current
  const anim2 = useRef(new Animated.Value(0)).current
  const anim3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const opts = {
      toValue: 1,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(anim1, opts),
        Animated.timing(anim1, { ...opts, toValue: 0 }),
      ]),
    )
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(anim2, opts),
        Animated.timing(anim2, { ...opts, toValue: 0 }),
      ]),
    )
    const loop3 = Animated.loop(
      Animated.sequence([
        Animated.delay(240),
        Animated.timing(anim3, opts),
        Animated.timing(anim3, { ...opts, toValue: 0 }),
      ]),
    )

    loop1.start()
    loop2.start()
    loop3.start()

    return () => {
      loop1.stop()
      loop2.stop()
      loop3.stop()
    }
  }, [])

  const dot = (anim: Animated.Value) => ({
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.textSecondary,
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.9],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.8, 1.2, 0.8],
        }),
      },
    ],
  })

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        style,
      ]}
    >
      <Animated.View style={dot(anim1)} />
      <Animated.View style={dot(anim2)} />
      <Animated.View style={dot(anim3)} />
    </View>
  )
}
