import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { brand } from '../theme';

const SLIDER_THUMB_SIZE = 24;
const SLIDER_TRACK_HEIGHT = 8;

export type RadiusSliderProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (v: number) => void;
  onSlidingComplete: (v: number) => void;
};

export function RadiusSlider({
  value,
  min,
  max,
  step,
  onValueChange,
  onSlidingComplete,
}: RadiusSliderProps) {
  const trackRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, width: 1 });
  const lastValueRef = useRef(value);
  const [trackWidth, setTrackWidth] = useState(1);
  const [liveValue, setLiveValue] = useState<number | null>(null);
  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, v)), [min, max]);
  const clampAndRound = useCallback(
    (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step)),
    [min, max, step]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        trackRef.current?.measureInWindow((x, _y, _measuredWidth) => {
          // Use width from onLayout only — measureInWindow width can differ and
          // inflate the denominator so ratio never reaches 1 at the right edge.
          layoutRef.current.x = x;
          const { width } = layoutRef.current;
          const pageX = evt.nativeEvent.pageX ?? 0;
          const ratio = width > 0 ? (pageX - x) / width : 0;
          const raw = clamp(min + ratio * (max - min));
          setLiveValue(raw);
          const rounded = clampAndRound(raw);
          lastValueRef.current = rounded;
          onValueChange(rounded);
        });
      },
      onPanResponderMove: (evt) => {
        const { x, width } = layoutRef.current;
        const pageX = evt.nativeEvent.pageX ?? 0;
        const ratio = width > 0 ? (pageX - x) / width : 0;
        const raw = clamp(min + ratio * (max - min));
        setLiveValue(raw);
        const rounded = clampAndRound(raw);
        lastValueRef.current = rounded;
        onValueChange(rounded);
      },
      onPanResponderRelease: () => {
        const rounded = lastValueRef.current;
        onSlidingComplete(rounded);
        setLiveValue(null);
      },
    })
  ).current;

  const range = max - min;
  const displayValue = liveValue !== null ? liveValue : value;
  const ratio = range > 0 ? (displayValue - min) / range : 0;
  const thumbLeft = ratio * Math.max(0, trackWidth - SLIDER_THUMB_SIZE);

  return (
    <View
      style={styles.container}
      ref={trackRef}
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        layoutRef.current.width = width;
        setTrackWidth(width);
      }}
      {...panResponder.panHandlers}
    >
      <View style={styles.track}>
        <View
          style={[
            styles.filledTrack,
            trackWidth > SLIDER_THUMB_SIZE
              ? { width: thumbLeft + SLIDER_THUMB_SIZE }
              : { width: `${ratio * 100}%` },
          ]}
        />
      </View>
      <View style={[styles.thumb, { left: thumbLeft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: SLIDER_TRACK_HEIGHT,
    borderRadius: SLIDER_TRACK_HEIGHT / 2,
    backgroundColor: '#E5E7EB',
    overflow: 'visible',
  },
  filledTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: SLIDER_TRACK_HEIGHT,
    borderRadius: SLIDER_TRACK_HEIGHT / 2,
    backgroundColor: brand.primary,
  },
  thumb: {
    position: 'absolute',
    width: SLIDER_THUMB_SIZE,
    height: SLIDER_THUMB_SIZE,
    borderRadius: SLIDER_THUMB_SIZE / 2,
    backgroundColor: brand.primary,
    top: (40 - SLIDER_THUMB_SIZE) / 2,
    zIndex: 1,
    elevation: 4,
  },
});
