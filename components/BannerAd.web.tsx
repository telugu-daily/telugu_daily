import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BannerAdProps {
  position?: number;
}

const BannerAdComponent: React.FC<BannerAdProps> = ({ position }) => {
  return (
    <View style={styles.adContainer}>
      <Text style={styles.placeholderText}>
        [Ad Placeholder - Position {position}]
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  adContainer: {
    alignItems: 'center',
    marginVertical: 12,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default BannerAdComponent;
