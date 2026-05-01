import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Trophy, MessageSquare } from 'lucide-react-native';
import {
  getUserJoinDate,
  getUserCurrentDay,
  getDaysSinceJoining as getDaysSinceJoiningUtil,
  loadTotalSentencesLearned,
  loadTotalMasteredSentences,
  loadActualDaysLearned,
  initializeUserJoinDate,
  calculateCurrentStreak as calculateCurrentStreakUtil,
  calculateLongestStreak as calculateLongestStreakUtil
} from '@/utils/userJourney';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';


export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  // State for dynamic user data
  const [userJoinDate, setUserJoinDate] = useState<Date | null>(null);
  const [actualDaysLearned, setActualDaysLearned] = useState(0);
  const [memberSinceText, setMemberSinceText] = useState('');
  const [daysSinceJoining, setDaysSinceJoining] = useState(0);

  // Dynamic statistics state
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalSentences, setTotalSentences] = useState(0);
  const [masteredSentences, setMasteredSentences] = useState(0);


  // Function to initialize and load join date
  const loadJoinDate = async () => {
    try {
      const joinDate = await initializeUserJoinDate();
      setUserJoinDate(joinDate);

      const monthYear = joinDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
      setMemberSinceText(`Member since ${monthYear}`);

      const days = await getDaysSinceJoiningUtil();
      setDaysSinceJoining(days);
    } catch (error) {
      console.log('Error loading join date:', error);
    }
  };

  // Function to load user data
  const loadUserData = async () => {
    try {
      const daysLearned = await loadActualDaysLearned();
      setActualDaysLearned(daysLearned);
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  // Function to load all statistics using centralized utilities
  const loadAllStatistics = async () => {
    try {
      const currentDay = await getUserCurrentDay();
      
      const [currentStreakCount, longestStreakCount, totalSentenceCount, masteredSentenceCount] = await Promise.all([
        calculateCurrentStreakUtil(),
        calculateLongestStreakUtil(),
        loadTotalSentencesLearned(currentDay),
        loadTotalMasteredSentences(currentDay)
      ]);

      setCurrentStreak(currentStreakCount);
      setLongestStreak(longestStreakCount);
      setTotalSentences(totalSentenceCount);
      setMasteredSentences(masteredSentenceCount);
    } catch (error) {
      console.log('Error loading statistics:', error);
    }
  };

  // Load all data on component mount
  // Reload data every time the screen is focused (tab switch)
  useFocusEffect(
    useCallback(() => {
      const initializeAllUserData = async () => {
        await loadJoinDate();
        await loadUserData();
        await loadAllStatistics();
      };

      initializeAllUserData();
    }, [])
  );


  const userStats = {
    name: user?.email ? user.email.split('@')[0] : 'Telugu Learner',
    joinDate: memberSinceText || 'Loading...',
    currentStreak: currentStreak,
    longestStreak: longestStreak,
    totalSentences: totalSentences,
    masteredSentences: masteredSentences,
    daysActive: daysSinceJoining,
    daysLearned: actualDaysLearned,
    level: totalSentences < 100 ? 'Beginner' :
           totalSentences < 500 ? 'Intermediate' :
           totalSentences < 1000 ? 'Advanced' : 'Expert',
  };

  const achievements = [
    {
      id: 1,
      title: 'First Steps',
      icon: '🌱',
      unlocked: totalSentences >= 50,
      description: 'Completed first 50 sentences'
    },
    {
      id: 2,
      title: 'Consistent Learner',
      icon: '🔥',
      unlocked: currentStreak >= 5,
      description: '5-day learning streak'
    },
    {
      id: 3,
      title: 'Quick Learner',
      icon: '⚡',
      unlocked: masteredSentences >= 100,
      description: 'Mastered 100 sentences'
    },
    {
      id: 4,
      title: 'Night Owl',
      icon: '🌙',
      unlocked: longestStreak >= 7,
      description: 'Learn for 7 consecutive days'
    },
    {
      id: 5,
      title: 'Master Student',
      icon: '🎓',
      unlocked: masteredSentences >= 500,
      description: 'Master 500 sentences'
    },
  ];


  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#4ECDC4', '#44B3AC']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <User size={20} color="#FFFFFF" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userStats.name}</Text>
            <Text style={styles.userLevel}>{userStats.level} • {userStats.joinDate}</Text>
            <Text style={styles.userSubLevel}>
              {actualDaysLearned} days learned • {daysSinceJoining} days active
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{actualDaysLearned}</Text>
            <Text style={styles.statLabel}>Days Learned</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{masteredSentences}</Text>
            <Text style={styles.statLabel}>Mastered</Text>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Trophy size={20} color={'#F5A623'} />
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>

          <View style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <TouchableOpacity
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  achievement.unlocked && styles.unlockedAchievement
                ]}
              >
                <Text style={[
                  styles.achievementIcon,
                  !achievement.unlocked && styles.lockedIcon
                ]}>
                  {achievement.unlocked ? achievement.icon : '🔒'}
                </Text>
                <Text style={[
                  styles.achievementTitle,
                  !achievement.unlocked && styles.lockedTitle
                ]}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Learning Stats Detail */}
        <View style={styles.sectionContainer}>
           <Text style={styles.sectionTitle}>Learning Journey</Text>

          <View style={styles.detailedStats}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Join Date</Text>
              <Text style={styles.detailValue}>
                {userJoinDate ? userJoinDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'Loading...'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Days Since Joining</Text>
              <Text style={styles.detailValue}>{daysSinceJoining} days</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Days Learned</Text>
              <Text style={styles.detailValue}>{actualDaysLearned} days</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Streak</Text>
              <Text style={styles.detailValue}>{currentStreak} days</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Longest Streak</Text>
              <Text style={styles.detailValue}>{longestStreak} days</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Sentences</Text>
              <Text style={styles.detailValue}>{totalSentences}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mastered</Text>
              <Text style={styles.detailValue}>{masteredSentences}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Learning Consistency</Text>
              <Text style={styles.detailValue}>
                {daysSinceJoining > 0 ?
                  Math.round((actualDaysLearned / daysSinceJoining) * 100) : 0}%
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mastery Rate</Text>
              <Text style={styles.detailValue}>
                {totalSentences > 0 ? Math.round((masteredSentences / totalSentences) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>

         <View style={styles.appInfo}>
           <TouchableOpacity
             style={styles.reportButton}
             onPress={() => Linking.openURL('https://docs.google.com/forms/d/e/1FAIpQLScJ0qNcFdzrdGi0pJNp5PSW112FkNjC89eK9NDjPBP4YD2brg/viewform')}
           >
             <MessageSquare size={18} color="#FFFFFF" />
             <Text style={styles.reportButtonText}>Report a Sentence</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={[styles.reportButton, { backgroundColor: '#E74C3C', marginTop: -8 }]}
             onPress={signOut}
           >
             <Text style={styles.reportButtonText}>Sign Out</Text>
           </TouchableOpacity>
           <Text style={styles.appInfoText}>Telugu Daily v1.0.0</Text>
           <Text style={styles.appInfoText}>Made with ❤️ for Telugu learners</Text>
         </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  userLevel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  userSubLevel: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#000',

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.1,

    shadowRadius: 4,

    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#4ECDC4',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',

    shadowOffset: { width: 0, height: 2 },

    shadowOpacity: 0.1,

    shadowRadius: 4,

    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#2C3E50',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  achievementCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E1E6',
  },
  unlockedAchievement: {
    borderColor: '#F5A623',
    backgroundColor: '#FFFEF7',
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  lockedIcon: {
    opacity: 0.5,
  },
  achievementTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 4,
  },
  lockedTitle: {
    color: '#8E8E93',
  },
  achievementDescription: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  detailedStats: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#2C3E50',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#4ECDC4',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 40,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  reportButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#8E8E93',
    marginVertical: 2,
  },
});
