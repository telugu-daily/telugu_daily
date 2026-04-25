import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, ArrowLeft } from 'lucide-react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';

export default function NotFoundScreen() {
  let [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }
  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#E74C3C', '#C0392B']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Oops!</Text>
            <TouchableOpacity style={styles.homeButton}>
              <Home size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Page not found</Text>
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>🔍</Text>
            <Text style={styles.errorTitle}>Page Not Found</Text>
            <Text style={styles.errorMessage}>
              The page you're looking for doesn't exist or has been moved.
            </Text>
            
            <Link href="/" asChild>
              <TouchableOpacity style={styles.homeLink}>
                <ArrowLeft size={20} color="#FFFFFF" />
                <Text style={styles.homeLinkText}>Go to Home</Text>
              </TouchableOpacity>
            </Link>

            <View style={styles.suggestionContainer}>
              <Text style={styles.suggestionTitle}>Quick Navigation:</Text>
              <Link href="/" asChild>
                <TouchableOpacity style={styles.suggestionLink}>
                  <Text style={styles.suggestionText}>📚 Today's Lessons</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/previous" asChild>
                <TouchableOpacity style={styles.suggestionLink}>
                  <Text style={styles.suggestionText}>📖 Previous Days</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/progress" asChild>
                <TouchableOpacity style={styles.suggestionLink}>
                  <Text style={styles.suggestionText}>📊 Your Progress</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/profile" asChild>
                <TouchableOpacity style={styles.suggestionLink}>
                  <Text style={styles.suggestionText}>👤 Profile</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  homeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  homeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2AA8A8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 32,
    gap: 8,
  },
  homeLinkText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  suggestionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  suggestionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  suggestionLink: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2AA8A8',
  },
  suggestionText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#2C3E50',
  },
});