import { Dimensions, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SvgXml } from 'react-native-svg';

import { formatDate } from '@utils/DateTime';
import { getWMBRLogoSVG } from '@utils/WMBRLogo';
import { generateGradientColors } from '@utils/GradientColors';
import { CORE_COLORS } from '@utils/Colors';

const { width } = Dimensions.get('window');
const ALBUM_SIZE = width * 0.6;

const ShowImage = ({
  showName,
  archiveDate,
}: {
  showName: string;
  archiveDate?: string;
}) => {
  const [gradientStart, gradientEnd] = generateGradientColors(showName);

  return (
    <View style={styles.albumSection}>
      <View style={[styles.albumCover, { backgroundColor: gradientStart }]}>
        <LinearGradient
          colors={[gradientStart, gradientEnd, 'rgba(0,0,0,0.3)']}
          locations={[0, 0.6, 1]}
          style={styles.albumGradient}
        >
          <View style={styles.albumContent}>
            {/* Centered logo at top */}
            <View style={styles.albumLogoContainer}>
              <SvgXml
                xml={getWMBRLogoSVG(CORE_COLORS.WHITE)}
                width={60}
                height={13}
              />
            </View>

            {/* Left-aligned content area */}
            <View style={styles.albumTextContainer}>
              <Text style={styles.albumShowName} numberOfLines={2}>
                {showName}
              </Text>
              {archiveDate ? (
                <>
                  <Text style={styles.albumArchiveLabel}>ARCHIVE</Text>
                  <Text style={styles.albumDate}>
                    {formatDate(archiveDate)}
                  </Text>
                </>
              ) : (
                <Text style={styles.albumFrequency}>88.1 FM</Text>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  albumSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  albumCover: {
    width: ALBUM_SIZE,
    height: ALBUM_SIZE,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  albumGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: 0,
  },
  albumContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  albumLogoContainer: {
    alignItems: 'center',
  },
  albumTextContainer: {
    alignItems: 'flex-start',
    flex: 1,
    justifyContent: 'flex-end',
    paddingLeft: 20,
  },
  albumShowName: {
    color: CORE_COLORS.WHITE,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  albumArchiveLabel: {
    color: CORE_COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  albumDate: {
    color: CORE_COLORS.WHITE,
    fontSize: 14,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'left',
  },
  albumFrequency: {
    color: CORE_COLORS.WHITE,
    fontSize: 14,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'left',
  },
});

export { ShowImage };
