import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Play,
  RotateCcw,
  CheckCircle,
  Trophy,
  Calendar,
  User
} from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { fetchSentencesByDay, getCachedSentences, Sentence } from '@/utils/api';
import BannerAdComponent from '@/components/BannerAd';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { rescheduleAfterCompletion } from '@/hooks/useNotifications';

// Get screen dimensions
const { height: screenHeight } = Dimensions.get('window');

// Define the data structure for list items
interface SentenceItem {
  id: number;
  telugu: string;
  english: string;
  type: 'sentence';
}

interface AdItem {
  id: string;
  type: 'ad';
  position: number;
}

type ListItem = SentenceItem | AdItem;

// ✅ PERFORMANCE OPTIMIZATION 1: Memoized Sentence Card Component
const SentenceCard = React.memo<{
  item: SentenceItem;
  sentenceNumber: number;
  isCompleted: boolean;
  isMastered: boolean;
  viewCount: number;
  onTextToSpeech: (text: string, isEnglish: boolean) => void;
  onKnowIt: (sentenceId: number) => void;
}>(({ item, sentenceNumber, isCompleted, isMastered, viewCount, onTextToSpeech, onKnowIt }) => (
  <View style={[
    styles.sentenceCard,
    isMastered && styles.masteredSentenceCard
  ]}>
    <View style={styles.cardHeader}>
      <Text style={styles.sentenceNumber}>#{sentenceNumber}</Text>
      {isMastered && (
        <View style={styles.masteredBadge}>
          <Text style={styles.masteredBadgeText}>🌟 Mastered</Text>
        </View>
      )}
    </View>

    <TouchableOpacity
      style={styles.teluguContainer}
      onPress={() => onTextToSpeech(item.telugu, false)}
    >
      <Text style={styles.teluguText}>{item.telugu}</Text>
      <Play size={20} color={'#4ECDC4'} style={styles.playIcon} />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.englishContainer}
      onPress={() => onTextToSpeech(item.english, true)}
    >
      <Text style={styles.englishText}>{item.english}</Text>
      <Play size={20} color={'#F5A623'} style={styles.playIcon} />
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.knowItButton,
        isCompleted && styles.knowItButtonCompleted,
        isMastered && styles.knowItButtonMastered
      ]}
      onPress={() => onKnowIt(item.id)}
    >
      {isMastered ? (
        <Trophy size={16} color="#E55722" style={styles.checkIcon} />
      ) : isCompleted ? (
        <CheckCircle size={16} color="#27AE60" style={styles.checkIcon} />
      ) : null}
      <Text style={[
        styles.knowItText,
        isCompleted && styles.knowItTextCompleted,
        isMastered && styles.knowItTextMastered
      ]}>
        {isMastered ? 'Mastered!' : 'learned'}
      </Text>
    </TouchableOpacity>

    <Text style={[
      styles.viewedText,
      viewCount >= 2 && styles.viewedTextMastery
    ]}>
      Viewed {viewCount} times {viewCount >= 2 && '• Mastered! 🎉'}
    </Text>
  </View>
));

// ✅ PERFORMANCE OPTIMIZATION 2: Memoized Ad Component
const AdCard = React.memo<{ position: number }>(({ position }) => (
  <BannerAdComponent position={position} />
));

export default function HomeScreen() {
  const { user } = useAuth();
  
  // State management
  const [currentDay, setCurrentDay] = useState(1);
  const [completedSentences, setCompletedSentences] = useState<{ [key: number]: boolean }>({});
  const [masteredSentences, setMasteredSentences] = useState<{ [key: number]: boolean }>({});
  const [viewedCount, setViewedCount] = useState<{ [key: number]: number }>({});
  const [joinDate, setJoinDate] = useState<Date | null>(null);
  const [daysInJourney, setDaysInJourney] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [todaysSentences, setTodaysSentences] = useState<Sentence[]>([]);

  // Sentences are loaded via loadSentencesForDay
  const completedCount = Object.keys(completedSentences).length;
  const masteredCount = Object.keys(masteredSentences).length;

  // Calculate user's current day with better debugging
  const calculateUserCurrentDay = (userJoinDate: Date): number => {
    const today = new Date();

    // DEBUG: Log the dates
    console.log('=== DAY CALCULATION DEBUG ===');
    console.log('User Join Date:', userJoinDate.toISOString());
    console.log('Today Date:', today.toISOString());

    // FIXED: Use date-only comparison (ignore time)
    const joinDateOnly = new Date(userJoinDate.getFullYear(), userJoinDate.getMonth(), userJoinDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const timeDifference = todayOnly.getTime() - joinDateOnly.getTime();
    const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const userCurrentDay = daysDifference + 1;

    // DEBUG: Log the calculation
    console.log('Days Difference:', daysDifference);
    console.log('User Current Day:', userCurrentDay);
    console.log('========================');

    return Math.min(Math.max(1, userCurrentDay), 300);
  };

  // Get sentence range for any day
  const getSentenceRange = (dayNum: number) => {
    const startSentence = (dayNum - 1) * 50 + 1;
    const endSentence = dayNum * 50;
    return { start: startSentence, end: endSentence };
  };

  // Initialize app with user-specific timeline
  useEffect(() => {
    initializeUserJourney();
  }, []);

  // Load sentences: cache-first, then refresh from API in background
  const loadSentencesForDay = async (day: number) => {
    setFetchError(null);
    try {
      // 1) Try loading from local cache first (instant)
      const cached = await getCachedSentences(day);
      if (cached && cached.length > 0) {
        setTodaysSentences(cached);
        setIsLoading(false);
        console.log(`Loaded ${cached.length} cached sentences for day ${day}`);

        // 2) Refresh from API in background (silent update)
        fetchSentencesByDay(day)
          .then((data) => {
            if (data && data.length > 0) {
              setTodaysSentences(data);
              console.log(`Refreshed ${data.length} sentences from API for day ${day}`);
            }
          })
          .catch((err) => console.log('Background refresh failed (using cache):', err?.message));
        return;
      }

      // 3) No cache — fetch from API (first-time load)
      console.log(`Fetching sentences for day ${day} from API...`);
      console.log(`API URL: ${process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api'}`);
      const data = await fetchSentencesByDay(day);
      if (data && data.length > 0) {
        setTodaysSentences(data);
        console.log(`Loaded ${data.length} sentences for day ${day}`);
        return;
      }
      setFetchError(`No sentences found for Day ${day}. Make sure the database is seeded.`);
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      console.log('API fetch failed:', msg);
      setFetchError(`Unable to load today's sentences. Please check your internet connection and try again.`);
    }
  };

  const initializeUserJourney = async () => {
    try {
      setIsLoading(true);

      const storedJoinDate = await AsyncStorage.getItem('userJoinDate');
      const today = new Date();

      console.log('=== INITIALIZATION DEBUG ===');
      console.log('Stored Join Date:', storedJoinDate);
      console.log('Today:', today.toISOString());

      if (storedJoinDate) {
        // Existing user
        const userJoinDate = new Date(storedJoinDate);
        setJoinDate(userJoinDate);

        const userCurrentDay = calculateUserCurrentDay(userJoinDate);
        const totalDaysInJourney = Math.floor((today.getTime() - userJoinDate.getTime()) / (1000 * 60 * 60 * 24));

        console.log('Calculated Current Day:', userCurrentDay);
        console.log('Total Days in Journey:', totalDaysInJourney);

        setCurrentDay(userCurrentDay);
        setDaysInJourney(totalDaysInJourney);

        // Load sentences and day data in parallel
        await Promise.all([
          loadSentencesForDay(userCurrentDay),
          loadDaySpecificData(userCurrentDay)
        ]);

      } else {
        // New user - this shouldn't happen since you're already existing user
        const todayAsJoinDate = new Date();
        const joinDateString = todayAsJoinDate.toISOString();

        console.log('Creating new user with join date:', joinDateString);

        await AsyncStorage.setItem('userJoinDate', joinDateString);

        setJoinDate(todayAsJoinDate);
        setCurrentDay(1);
        setDaysInJourney(0);

        await loadSentencesForDay(1);
        await loadStoredData();
      }
      console.log('==============================');
    } catch (error) {
      console.log('Error initializing user journey:', error);
      const today = new Date();
      setJoinDate(today);
      setCurrentDay(1);
      setDaysInJourney(0);
      await loadStoredData();
    } finally {
      setIsLoading(false);
    }
  };

  // Load stored data from AsyncStorage (old format compatibility)
  const loadStoredData = async () => {
    try {
      const [storedCompleted, storedMastered, storedViewed] = await Promise.all([
        AsyncStorage.getItem('completedSentences'),
        AsyncStorage.getItem('masteredSentences'),
        AsyncStorage.getItem('viewedCount')
      ]);

      if (storedCompleted) {
        setCompletedSentences(JSON.parse(storedCompleted));
      }

      if (storedMastered) {
        setMasteredSentences(JSON.parse(storedMastered));
      }

      if (storedViewed) {
        setViewedCount(JSON.parse(storedViewed));
      }

    } catch (error) {
      console.log('Error loading stored data:', error);
    }
  };

  // Load day-specific data when switching days
  const loadDaySpecificData = async (dayNumber: number) => {
    try {
      const [storedCompleted, storedMastered, storedViewed] = await Promise.all([
        AsyncStorage.getItem(`completedSentences_day_${dayNumber}`),
        AsyncStorage.getItem(`masteredSentences_day_${dayNumber}`),
        AsyncStorage.getItem(`viewedCount_day_${dayNumber}`)
      ]);

      // If day-specific data exists, use it
      if (storedCompleted || storedMastered || storedViewed) {
        setCompletedSentences(storedCompleted ? JSON.parse(storedCompleted) : {});
        setMasteredSentences(storedMastered ? JSON.parse(storedMastered) : {});
        setViewedCount(storedViewed ? JSON.parse(storedViewed) : {});
      } else {
        // Fallback to old format for backward compatibility
        await loadStoredData();
      }

    } catch (error) {
      console.log('Error loading day specific data:', error);
      setCompletedSentences({});
      setMasteredSentences({});
      setViewedCount({});
    }
  };

  // Manual day refresh function for testing
  const refreshCurrentDay = useCallback(async () => {
    const storedJoinDate = await AsyncStorage.getItem('userJoinDate');
    if (storedJoinDate) {
      const userJoinDate = new Date(storedJoinDate);
      const newCurrentDay = calculateUserCurrentDay(userJoinDate);
      setCurrentDay(newCurrentDay);
      await loadDaySpecificData(newCurrentDay);

      Alert.alert(
        '🔄 Day Refreshed',
        `Updated to Day ${newCurrentDay}!\n\nJoin Date: ${userJoinDate.toDateString()}\nToday: ${new Date().toDateString()}`,
        [{ text: 'Got it!', onPress: () => {} }]
      );
    }
  }, []);

  // DUAL SAVE - Save to AsyncStorage only (cloud sync happens on app background via backupToCloud)
  const saveToStorage = async (key: string, data: any) => {
    try {
      // Save in old format (for compatibility with other screens)
      await AsyncStorage.setItem(key, JSON.stringify(data));
      // Save in new day-specific format
      await AsyncStorage.setItem(`${key}_day_${currentDay}`, JSON.stringify(data));
      // Mark data as dirty so backupToCloud knows something changed
      await AsyncStorage.setItem('progressDirty', 'true');
    } catch (error) {
      console.log(`Error saving ${key}:`, error);
    }
  };

  // Auto-master sentences when Know It clicked 2+ times
  const checkAndUpdateMastered = async (sentenceId: number, newViewCount: number) => {
    if (newViewCount >= 2 && !masteredSentences[sentenceId]) {
      const updatedMastered = {
        ...masteredSentences,
        [sentenceId]: true
      };

      setMasteredSentences(updatedMastered);
      await saveToStorage('masteredSentences', updatedMastered);
    }
  };

  // ✅ PERFORMANCE OPTIMIZATION 3: Memoized callbacks
  const handleTextToSpeech = useCallback(async (text: string, isEnglish: boolean = true) => {
    try {
      const language = isEnglish ? 'en-US' : 'te-IN';
      
      // English plays very slow (0.5) for learning, Telugu plays at normal speed (1.0)
      const speedRate = isEnglish ? 0.5 : 1.0; 
      
      await Speech.speak(text, {
        language,
        pitch: 1.0,
        rate: speedRate,
      });
    } catch (error) {
      console.log('TTS Error:', error);
    }
  }, []);

  const handleKnowIt = useCallback(async (sentenceId: number) => {
    try {
      // Use functional updates to avoid closing over state
      let updatedCompleted: { [key: number]: boolean } = {};
      setCompletedSentences(prev => {
        updatedCompleted = { ...prev, [sentenceId]: true };
        return updatedCompleted;
      });
      await saveToStorage('completedSentences', updatedCompleted);

      let newViewCount = 0;
      let updatedViewCount: { [key: number]: number } = {};
      setViewedCount(prev => {
        newViewCount = (prev[sentenceId] || 0) + 1;
        updatedViewCount = { ...prev, [sentenceId]: newViewCount };
        return updatedViewCount;
      });
      await saveToStorage('viewedCount', updatedViewCount);

      if (newViewCount >= 2) {
        setMasteredSentences(prev => {
          if (!prev[sentenceId]) {
            const updatedMastered = { ...prev, [sentenceId]: true };
            saveToStorage('masteredSentences', updatedMastered);
            return updatedMastered;
          }
          return prev;
        });
      }

      const newCompletedCount = Object.keys(updatedCompleted).length;
      if (newCompletedCount >= 50) {
        // Save day as learned for progress tracking
        const storedLearnedDays = await AsyncStorage.getItem('learnedDays');
        const learnedDays = storedLearnedDays ? JSON.parse(storedLearnedDays) : {};
        learnedDays[currentDay] = true;
        await AsyncStorage.setItem('learnedDays', JSON.stringify(learnedDays));

        const sentenceRange = getSentenceRange(currentDay);
        const isLastDay = currentDay >= 300;

        rescheduleAfterCompletion();

        Alert.alert(
          '🎉 Day Completed!',
          `Outstanding! You've completed Day ${currentDay} (sentences ${sentenceRange.start}-${sentenceRange.end})!\n\n${isLastDay ? '🏆 Congratulations! You\'ve completed your entire 300-day [translate:తెలుగు] learning journey!' : `📅 Tomorrow will be Day ${currentDay + 1} with sentences ${getSentenceRange(currentDay + 1).start}-${getSentenceRange(currentDay + 1).end}!`}`,
          [{ text: isLastDay ? '🎊 Amazing!' : '🌟 Excellent!', onPress: () => {} }]
        );
      }

    } catch (error) {
      console.log('Error handling Know It:', error);
    }
  }, [currentDay]);

  const resetProgress = useCallback(() => {
    const sentenceRange = getSentenceRange(currentDay);
    Alert.alert(
      '🔄 Reset Today\'s Progress',
      `This will clear your progress for Day ${currentDay} (sentences ${sentenceRange.start}-${sentenceRange.end}).\n\nAre you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🗑️ Reset Day ' + currentDay,
          style: 'destructive',
          onPress: async () => {
            try {
              const emptyData = {};
              setCompletedSentences(emptyData);
              setMasteredSentences(emptyData);
              setViewedCount(emptyData);

              await Promise.all([
                saveToStorage('completedSentences', emptyData),
                saveToStorage('masteredSentences', emptyData),
                saveToStorage('viewedCount', emptyData)
              ]);

              Alert.alert('✅ Reset Complete', `Day ${currentDay} has been reset. Ready for a fresh start!`);
            } catch (error) {
              console.log('Error resetting progress:', error);
            }
          }
        }
      ],
      { cancelable: true }
    );
  }, [currentDay]);

  // ✅ PERFORMANCE OPTIMIZATION 4: Optimized data with ads using useMemo
  const dataWithAds = useMemo((): ListItem[] => {
    const result: ListItem[] = [];
    const adPositions = [10, 20, 30, 40, 50];

    todaysSentences.forEach((sentence, index) => {
      result.push({
        ...sentence,
        type: 'sentence' as const
      });

      const sentenceNumber = index + 1;

      if (adPositions.includes(sentenceNumber)) {
        result.push({
          id: `ad_after_${sentenceNumber}`,
          type: 'ad' as const,
          position: sentenceNumber
        });
      }
    });

    return result;
  }, [todaysSentences]);

  // ✅ PERFORMANCE OPTIMIZATION: Precompute sentence number map for O(1) lookup
  const sentenceNumberMap = useMemo(() => {
    const map: { [key: number]: number } = {};
    todaysSentences.forEach((s, i) => { map[s.id] = i + 1; });
    return map;
  }, [todaysSentences]);

  // ✅ PERFORMANCE OPTIMIZATION 5: Optimized renderItem with memoized components
  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'ad') {
      return <AdCard position={item.position} />;
    }

    const sentence = item as SentenceItem;
    const isCompleted = completedSentences[sentence.id];
    const isMastered = masteredSentences[sentence.id];
    const viewCount = viewedCount[sentence.id] || 0;
    
    // O(1) lookup instead of O(n) findIndex
    const sentenceNumber = sentenceNumberMap[sentence.id] || 0;

    return (
      <SentenceCard
        item={sentence}
        sentenceNumber={sentenceNumber}
        isCompleted={isCompleted}
        isMastered={isMastered}
        viewCount={viewCount}
        onTextToSpeech={handleTextToSpeech}
        onKnowIt={handleKnowIt}
      />
    );
  }, [completedSentences, masteredSentences, viewedCount, sentenceNumberMap, handleTextToSpeech, handleKnowIt]);

  // ✅ PERFORMANCE OPTIMIZATION 6: keyExtractor
  const keyExtractor = useCallback((item: ListItem) => item.id.toString(), []);

  // ✅ PERFORMANCE OPTIMIZATION 7: ItemSeparatorComponent
  const ItemSeparator = useCallback(() => <View style={styles.itemSeparator} />, []);

  // Show loading screen — matches splash screen colors for seamless transition
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={'#FFFFFF'} />
        <Text style={styles.loadingText}>Loading your journey...</Text>
      </View>
    );
  }

  // Show error screen with retry
  if (fetchError && todaysSentences.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorText}>{fetchError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            loadSentencesForDay(currentDay).finally(() => setIsLoading(false));
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sentenceRange = getSentenceRange(currentDay);

  return (
    <View style={styles.container}>
      {/* COMPACT HEADER - Only 35% of screen */}
      <LinearGradient
        colors={['#4ECDC4', '#44B3AC']}
        style={styles.compactHeader}
      >
        <View style={styles.headerContent}>
          <Text style={styles.appTitle}>Telugu  Daily</Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetProgress}>
            <RotateCcw size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Debug button to refresh day manually */}
        <TouchableOpacity
          style={styles.compactDayContainer}
          onPress={refreshCurrentDay}
        >
          <Calendar size={14} color="#FFFFFF" style={styles.calendarIcon} />
          <View style={styles.compactDayInfo}>
            <Text style={styles.compactDayTitle}>Day {currentDay} • {sentenceRange.start}-{sentenceRange.end}</Text>
            <Text style={styles.compactJourneyText}>
              {daysInJourney === 0 ? '🎉 Starting today' : `📅 Day ${daysInJourney + 1} of journey`}
            </Text>
          </View>
          <User size={14} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.compactProgressContainer}>
          <View style={styles.compactProgressItem}>
            <Text style={styles.compactProgressNumber}>{completedCount}/50</Text>
            <Text style={styles.compactProgressLabel}>Learned</Text>
          </View>

          <View style={styles.compactProgressItem}>
            <Text style={styles.compactProgressEmoji}>🌳</Text>
            <Text style={styles.compactProgressNumber}>{masteredCount}</Text>
            <Text style={styles.compactProgressLabel}>Mastered</Text>
          </View>

          <View style={styles.compactProgressItem}>
            <Text style={styles.compactProgressNumber}>{currentDay}/300</Text>
            <Text style={styles.compactProgressLabel}>Journey</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ✅ OPTIMIZED FlatList with Performance Props */}
      <FlatList
        data={dataWithAds}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
        ItemSeparatorComponent={ItemSeparator}
        style={styles.flatListContainer}
        // ✅ PERFORMANCE PROPS
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        initialNumToRender={8}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        disableVirtualization={false}
        // NOTE: getItemLayout removed — list contains mixed-height items (sentences + ads)
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#E74C3C',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  compactHeader: {
    height: screenHeight * 0.35,
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  resetButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  compactDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  calendarIcon: {
    marginRight: 8,
  },
  compactDayInfo: {
    flex: 1,
    alignItems: 'center',
  },
  compactDayTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  compactJourneyText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
  },
  compactProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
  },
  compactProgressItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  compactProgressNumber: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  compactProgressEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  compactProgressLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  flatListContainer: {
    flex: 1,
  },
  flatListContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  itemSeparator: {
    height: 8,
  },
  sentenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  masteredSentenceCard: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#E55722',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sentenceNumber: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#4ECDC4',
  },
  masteredBadge: {
    backgroundColor: '#E55722',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  masteredBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  teluguContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  teluguText: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'NotoSansTelugu-Regular',
    color: '#2C3E50',
    lineHeight: 32,
  },
  playIcon: {
    marginLeft: 12,
    marginTop: 6,
  },
  englishContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  englishText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#2C3E50',
    lineHeight: 24,
  },
  knowItButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F8F7',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  knowItButtonCompleted: {
    backgroundColor: '#FFFFFF',
    borderColor: '#27AE60',
  },
  knowItButtonMastered: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E55722',
  },
  checkIcon: {
    marginRight: 8,
  },
  knowItText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#4ECDC4',
  },
  knowItTextCompleted: {
    color: '#27AE60',
  },
  knowItTextMastered: {
    color: '#E55722',
  },
  viewedText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  viewedTextMastery: {
    color: '#E55722',
    fontFamily: 'Poppins-SemiBold',
  },
});
