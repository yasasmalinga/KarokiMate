import { LyricLine } from '@/services/database';
import React, { useEffect, useRef, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface LyricScrollerProps {
  lyrics: LyricLine[];
  currentTime: number;
  highlightColor?: string;
  textColor?: string;
  fontSize?: number;
  lineHeight?: number;
  onLineChange?: (lineIndex: number) => void;
  onScrollEnd?: () => void;
  autoScroll?: boolean;
  scrollSpeed?: number;
}

export const LyricScroller: React.FC<LyricScrollerProps> = ({
  lyrics,
  currentTime,
  highlightColor = '#FF6B6B',
  textColor = '#FFFFFF',
  fontSize = 18,
  lineHeight = 28,
  onLineChange,
  onScrollEnd,
  autoScroll = true,
  scrollSpeed = 1,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find current line based on time
  const findCurrentLine = (time: number): number => {
    for (let i = 0; i < lyrics.length; i++) {
      if (time >= lyrics[i].startTime && time <= lyrics[i].endTime) {
        return i;
      }
    }
    return 0;
  };

  // Auto-scroll to current line
  useEffect(() => {
    if (!autoScroll || isUserScrolling || !scrollViewRef.current) return;

    const newLineIndex = findCurrentLine(currentTime);
    if (newLineIndex !== currentLineIndex) {
      setCurrentLineIndex(newLineIndex);
      onLineChange?.(newLineIndex);
      
      // Smooth scroll to the current line
      const scrollY = newLineIndex * lineHeight;
      scrollViewRef.current.scrollTo({
        y: scrollY,
        animated: true,
      });
    }
  }, [currentTime, autoScroll, isUserScrolling, currentLineIndex, lineHeight, onLineChange, lyrics.length]);

  // Handle user scroll
  const handleScroll = () => {
    setIsUserScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set timeout to re-enable auto-scroll
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 2000);
  };

  const handleScrollEnd = () => {
    onScrollEnd?.();
  };

  // Render lyric line
  const renderLyricLine = (line: LyricLine, index: number) => {
    const isActive = index === currentLineIndex;
    const isPast = currentTime > line.endTime;
    const isFuture = currentTime < line.startTime;

    let lineStyle = styles.lyricLine;
    let textStyle = [styles.lyricText, { fontSize, color: textColor }];

    if (isActive) {
      lineStyle = [styles.lyricLine, styles.activeLine] as any;
      textStyle = [styles.lyricText, styles.activeText, { fontSize, color: highlightColor }];
    } else if (isPast) {
      textStyle = [styles.lyricText, styles.pastText, { fontSize, color: textColor }];
    } else if (isFuture) {
      textStyle = [styles.lyricText, styles.futureText, { fontSize, color: textColor }];
    }

    return (
      <View key={index} style={[lineStyle, { height: lineHeight }]}>
        <Text style={textStyle}>{line.text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {lyrics.map((line, index) => renderLyricLine(line, index))}
      </ScrollView>
      
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${(currentLineIndex / Math.max(lyrics.length - 1, 1)) * 100}%`,
                backgroundColor: highlightColor 
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  lyricLine: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  activeLine: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  lyricText: {
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 24,
  },
  activeText: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#FF6B6B',
  },
  pastText: {
    opacity: 0.6,
    color: '#FFFFFF',
    fontSize: 18,
  },
  futureText: {
    opacity: 0.4,
    color: '#FFFFFF',
    fontSize: 18,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
