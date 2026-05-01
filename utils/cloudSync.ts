import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';

// Sync progress to cloud (upsert day data)
export const syncProgressToCloud = async (userId: string, dayNumber: number, data: any) => {
  try {
    if (!userId) return;

    // First fetch existing data for this day
    const { data: existingData, error: fetchError } = await supabase
      .from('user_day_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('day_number', dayNumber)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching existing day progress:', fetchError);
      return;
    }

    // Merge new data with existing
    const updatePayload: any = {
      user_id: userId,
      day_number: dayNumber,
      updated_at: new Date().toISOString(),
    };

    if (data.completedSentences) updatePayload.completed_sentences = data.completedSentences;
    if (data.masteredSentences) updatePayload.mastered_sentences = data.masteredSentences;
    if (data.viewedCount) updatePayload.viewed_count = data.viewedCount;

    // Keep existing data if we are not passing it
    if (existingData) {
      if (!data.completedSentences) updatePayload.completed_sentences = existingData.completed_sentences;
      if (!data.masteredSentences) updatePayload.mastered_sentences = existingData.mastered_sentences;
      if (!data.viewedCount) updatePayload.viewed_count = existingData.viewed_count;
    }

    // Upsert to Supabase
    const { error: upsertError } = await supabase
      .from('user_day_progress')
      .upsert(updatePayload, { onConflict: 'user_id,day_number' });

    if (upsertError) {
      console.error('Error syncing progress to cloud:', upsertError);
    }
  } catch (error) {
    console.error('Exception in syncProgressToCloud:', error);
  }
};

// Pull progress from cloud (used on login / reinstall)
export const pullProgressFromCloud = async (userId: string) => {
  try {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_day_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error pulling progress from cloud:', error);
      return;
    }

    if (data && data.length > 0) {
      let globalCompleted: any = {};
      let globalMastered: any = {};
      let globalViewed: any = {};

      for (const day of data) {
        // Save day-specific data
        if (day.completed_sentences) {
          await AsyncStorage.setItem(`completedSentences_day_${day.day_number}`, JSON.stringify(day.completed_sentences));
          globalCompleted = { ...globalCompleted, ...day.completed_sentences };
        }
        if (day.mastered_sentences) {
          await AsyncStorage.setItem(`masteredSentences_day_${day.day_number}`, JSON.stringify(day.mastered_sentences));
          globalMastered = { ...globalMastered, ...day.mastered_sentences };
        }
        if (day.viewed_count) {
          await AsyncStorage.setItem(`viewedCount_day_${day.day_number}`, JSON.stringify(day.viewed_count));
          globalViewed = { ...globalViewed, ...day.viewed_count };
        }
      }

      // Save global merged data for backward compatibility
      if (Object.keys(globalCompleted).length > 0) await AsyncStorage.setItem('completedSentences', JSON.stringify(globalCompleted));
      if (Object.keys(globalMastered).length > 0) await AsyncStorage.setItem('masteredSentences', JSON.stringify(globalMastered));
      if (Object.keys(globalViewed).length > 0) await AsyncStorage.setItem('viewedCount', JSON.stringify(globalViewed));
    }

    // Pull user profile (join_date)
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('join_date')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
    } else if (profileData && profileData.join_date) {
      await AsyncStorage.setItem('userJoinDate', profileData.join_date);
    }

  } catch (error) {
    console.error('Exception in pullProgressFromCloud:', error);
  }
};

// Migrate local data to cloud (one-time)
export const migrateLocalToCloud = async (userId: string, email?: string) => {
  try {
    if (!userId) return;

    // Check if migration already done
    const migrationDone = await AsyncStorage.getItem(`cloudMigrationDone_${userId}`);
    if (migrationDone === 'true') return;

    // Check if user has any local data worth migrating — skip 300-day loop for brand new users
    const joinDateStr = await AsyncStorage.getItem('userJoinDate');
    const learnedDaysRaw = await AsyncStorage.getItem('learnedDays');
    const hasLocalData = !!(joinDateStr || learnedDaysRaw);

    if (!hasLocalData) {
      // Brand new user — mark migration done immediately, nothing to migrate
      await AsyncStorage.setItem(`cloudMigrationDone_${userId}`, 'true');
      return;
    }

    console.log('Starting cloud migration for user:', userId);

    // 1. Migrate user profile
    const joinDate = joinDateStr ? new Date(joinDateStr).toISOString() : new Date().toISOString();

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email: email || '',
        join_date: joinDate,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) console.error('Error migrating user profile:', profileError);

    // 2. Migrate day-specific progress
    // We'll iterate up to 300 days to find any stored data
    for (let day = 1; day <= 300; day++) {
      const [completed, mastered, viewed] = await Promise.all([
        AsyncStorage.getItem(`completedSentences_day_${day}`),
        AsyncStorage.getItem(`masteredSentences_day_${day}`),
        AsyncStorage.getItem(`viewedCount_day_${day}`)
      ]);

      if (completed || mastered || viewed) {
        const updatePayload: any = {
          user_id: userId,
          day_number: day,
          updated_at: new Date().toISOString()
        };

        if (completed) updatePayload.completed_sentences = JSON.parse(completed);
        if (mastered) updatePayload.mastered_sentences = JSON.parse(mastered);
        if (viewed) updatePayload.viewed_count = JSON.parse(viewed);

        const { error: upsertError } = await supabase
          .from('user_day_progress')
          .upsert(updatePayload, { onConflict: 'user_id,day_number' });

        if (upsertError) {
          console.error(`Error migrating day ${day}:`, upsertError);
        } else {
          console.log(`Migrated day ${day} successfully`);
        }
      }
    }

    // Mark migration as done
    await AsyncStorage.setItem(`cloudMigrationDone_${userId}`, 'true');
    console.log('Cloud migration completed');

  } catch (error) {
    console.error('Exception in migrateLocalToCloud:', error);
  }
};
