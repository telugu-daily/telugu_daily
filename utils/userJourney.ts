import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Centralized utility functions for user journey calculations.
 * This ensures consistent day calculation across all screens.
 */

/**
 * Get the user's join date from AsyncStorage
 * @returns Promise<Date | null> - The user's join date or null if not set
 */
export const getUserJoinDate = async (): Promise<Date | null> => {
  try {
    const storedJoinDate = await AsyncStorage.getItem('userJoinDate');
    if (storedJoinDate) {
      return new Date(storedJoinDate);
    }
    return null;
  } catch (error) {
    console.log('Error getting user join date:', error);
    return null;
  }
};

/**
 * Calculate the user's current day based on their join date
 * @param userJoinDate - The date the user joined
 * @returns number - The current day (1-300)
 */
export const calculateUserCurrentDay = (userJoinDate: Date): number => {
  const today = new Date();

  // Use date-only comparison (ignore time)
  const joinDateOnly = new Date(
    userJoinDate.getFullYear(),
    userJoinDate.getMonth(),
    userJoinDate.getDate()
  );
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const timeDifference = todayOnly.getTime() - joinDateOnly.getTime();
  const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  const userCurrentDay = daysDifference + 1;

  // Clamp between 1 and 300
  return Math.min(Math.max(1, userCurrentDay), 300);
};

/**
 * Get the user's current day from AsyncStorage
 * This is the main function to use across all screens
 * @returns Promise<number> - The current day (1-300), defaults to 1 if no join date
 */
export const getUserCurrentDay = async (): Promise<number> => {
  try {
    const userJoinDate = await getUserJoinDate();
    if (userJoinDate) {
      return calculateUserCurrentDay(userJoinDate);
    }
    return 1;
  } catch (error) {
    console.log('Error getting user current day:', error);
    return 1;
  }
};

/**
 * Get the number of days since the user joined
 * @returns Promise<number> - Days since joining, 0 if no join date
 */
export const getDaysSinceJoining = async (): Promise<number> => {
  try {
    const userJoinDate = await getUserJoinDate();
    if (!userJoinDate) return 0;

    const today = new Date();
    const timeDifference = today.getTime() - userJoinDate.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
    return Math.max(0, daysDifference);
  } catch (error) {
    console.log('Error calculating days since joining:', error);
    return 0;
  }
};

/**
 * Initialize user join date if not already set
 * @returns Promise<Date> - The user's join date (existing or newly created)
 */
export const initializeUserJoinDate = async (): Promise<Date> => {
  try {
    const existingJoinDate = await getUserJoinDate();
    if (existingJoinDate) {
      return existingJoinDate;
    }

    // New user - set today as join date
    const today = new Date();
    const joinDateString = today.toISOString();
    await AsyncStorage.setItem('userJoinDate', joinDateString);
    return today;
  } catch (error) {
    console.log('Error initializing user join date:', error);
    return new Date();
  }
};

/**
 * Get sentence range for a specific day
 * @param dayNum - The day number (1-300)
 * @returns { start: number, end: number } - The sentence range
 */
export const getSentenceRange = (dayNum: number): { start: number; end: number } => {
  const startSentence = (dayNum - 1) * 50 + 1;
  const endSentence = dayNum * 50;
  return { start: startSentence, end: endSentence };
};

/**
 * Load total sentences learned from day-specific AsyncStorage data
 * @param currentDay - The current day to check up to
 * @returns Promise<number> - Total sentences learned
 */
export const loadTotalSentencesLearned = async (currentDay: number): Promise<number> => {
  try {
    let totalCount = 0;

    // Check day-specific data for all available days
    for (let day = 1; day <= currentDay; day++) {
      const dayCompleted = await AsyncStorage.getItem(`completedSentences_day_${day}`);
      if (dayCompleted) {
        const completedSentences = JSON.parse(dayCompleted);
        totalCount += Object.keys(completedSentences).length;
      }
    }

    // Fallback to old format if no day-specific data
    if (totalCount === 0) {
      const savedCompletedSentences = await AsyncStorage.getItem('completedSentences');
      if (savedCompletedSentences) {
        const completedSentences = JSON.parse(savedCompletedSentences);
        totalCount = Object.keys(completedSentences).length;
      }
    }

    return totalCount;
  } catch (error) {
    console.log('Error loading total sentences:', error);
    return 0;
  }
};

/**
 * Load total mastered sentences from day-specific AsyncStorage data
 * @param currentDay - The current day to check up to
 * @returns Promise<number> - Total mastered sentences
 */
export const loadTotalMasteredSentences = async (currentDay: number): Promise<number> => {
  try {
    let totalMastered = 0;

    // Check day-specific mastered data for all available days
    for (let day = 1; day <= currentDay; day++) {
      const dayMastered = await AsyncStorage.getItem(`masteredSentences_day_${day}`);
      if (dayMastered) {
        const masteredSentences = JSON.parse(dayMastered);
        totalMastered += Object.keys(masteredSentences).length;
      }
    }

    // Fallback to old format if no day-specific data
    if (totalMastered === 0) {
      const savedMasteredSentences = await AsyncStorage.getItem('masteredSentences');
      if (savedMasteredSentences) {
        const masteredSentences = JSON.parse(savedMasteredSentences);
        totalMastered = Object.keys(masteredSentences).length;
      }
    }

    return totalMastered;
  } catch (error) {
    console.log('Error loading mastered sentences:', error);
    return 0;
  }
};

/**
 * Load actual days learned count
 * @returns Promise<number> - Number of days with completed learning
 */
export const loadActualDaysLearned = async (): Promise<number> => {
  try {
    const savedLearnedDays = await AsyncStorage.getItem('learnedDays');
    if (savedLearnedDays) {
      const parsedDays = JSON.parse(savedLearnedDays);
      return Object.keys(parsedDays).length;
    }
    return 0;
  } catch (error) {
    console.log('Error loading actual days learned:', error);
    return 0;
  }
};

/**
 * Calculate the user's current learning streak (consecutive days from most recent)
 * @returns Promise<number> - Current streak count
 */
export const calculateCurrentStreak = async (): Promise<number> => {
  try {
    const savedLearnedDays = await AsyncStorage.getItem('learnedDays');
    if (!savedLearnedDays) return 0;

    const learnedDays = JSON.parse(savedLearnedDays);
    const sortedDays = Object.keys(learnedDays).map(Number).sort((a, b) => b - a);

    if (sortedDays.length === 0) return 0;

    let streak = 0;
    let currentDayCheck = sortedDays[0];

    for (const day of sortedDays) {
      if (day === currentDayCheck) {
        streak++;
        currentDayCheck--;
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.log('Error calculating current streak:', error);
    return 0;
  }
};

/**
 * Calculate the user's longest learning streak
 * @returns Promise<number> - Longest streak count
 */
export const calculateLongestStreak = async (): Promise<number> => {
  try {
    const savedLearnedDays = await AsyncStorage.getItem('learnedDays');
    if (!savedLearnedDays) return 0;

    const learnedDays = JSON.parse(savedLearnedDays);
    const sortedDays = Object.keys(learnedDays).map(Number).sort((a, b) => a - b);

    if (sortedDays.length === 0) return 0;

    let maxStreak = 1;
    let currentStreakCount = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] === sortedDays[i - 1] + 1) {
        currentStreakCount++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreakCount);
        currentStreakCount = 1;
      }
    }

    return Math.max(maxStreak, currentStreakCount);
  } catch (error) {
    console.log('Error calculating longest streak:', error);
    return 0;
  }
};