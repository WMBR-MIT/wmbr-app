import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ABOUT_PAGE_GRADIENT } from '@utils/GradientColors';
import Icon from 'react-native-vector-icons/Ionicons';
import { getWMBRLogoSVG } from '@utils/WMBRLogo';
import { COLORS } from '@utils/Colors';
import { SvgXml } from 'react-native-svg';

const openLink = (url: string) => Linking.openURL(url).catch(() => {});

const openWebsite = () => openLink('https://wmbr.org');
const openInstagram = () => openLink('https://www.instagram.com/wmbrfm');
const openTwitter = () => openLink('https://x.com/wmbr');
const openFacebook = () => openLink('https://www.facebook.com/wmbrfm');
const openMastodon = () => openLink('https://mastodon.mit.edu/@wmbr');
const openProgramGuide = () =>
  openLink('https://wmbr.org/WMBR_ProgramGuide.pdf');

export default function AboutPage() {
  return (
    <LinearGradient colors={ABOUT_PAGE_GRADIENT} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.logoRow}>
            <SvgXml xml={getWMBRLogoSVG('#FFFFFF')} width={60} height={16} />
          </View>

          <Text style={styles.body}>
            WMBR is the MIT campus radio station. We broadcast on 88.1 FM 24
            hours per day, 365 days a year. We transmit at 640 watts, effective
            radiated power from the top of Building E37 in Kendall Square in
            Cambridge, Massachusetts. Our programming includes a wide range of
            music shows, public affairs programs and eclectic audio
            entertainment.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Us</Text>

            <Text style={styles.contactLabel}>Text or Call the DJ</Text>
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => openLink('tel:+16172538810')}
              activeOpacity={0.8}
            >
              <Icon name="call-outline" size={20} color="#FFFFFF" />
              <View style={styles.textBlock}>
                <Text style={styles.linkText}>(617) 253-8810</Text>
                <Text style={styles.smallText}>Requests Line</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.contactLabel}>Email</Text>
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => openLink('mailto:music@wmbr.org')}
              activeOpacity={0.8}
            >
              <Icon name="mail-outline" size={20} color="#FFFFFF" />
              <View style={styles.textBlock}>
                <Text style={styles.linkText}>music@wmbr.org</Text>
                <Text style={styles.smallText}>Music Department</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => openLink('mailto:press@wmbr.org')}
              activeOpacity={0.8}
            >
              <Icon name="mail-outline" size={20} color="#FFFFFF" />
              <View style={styles.textBlock}>
                <Text style={styles.linkText}>press@wmbr.org</Text>
                <Text style={styles.smallText}>News Department</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.contactLabel}>Mailing Address</Text>
            <View style={styles.addressBlock}>
              <Text style={styles.addressLine}>WMBR Radio</Text>
              <Text style={styles.addressLine}>
                142 Memorial Drive, Room 50-030
              </Text>
              <Text style={styles.addressLine}>Cambridge, MA 02139</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={openProgramGuide}
              activeOpacity={0.8}
            >
              <Icon name="musical-notes-outline" size={18} color="#000" />
              <Text style={styles.buttonText}>Program Guide</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonOutline}
              onPress={openWebsite}
              activeOpacity={0.8}
            >
              <Icon name="globe-outline" size={18} color="#FFFFFF" />
              <Text style={styles.buttonOutlineText}>Visit Our Website</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity
              onPress={openInstagram}
              activeOpacity={0.8}
              style={styles.socialButton}
            >
              <Icon name="logo-instagram" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openTwitter}
              activeOpacity={0.8}
              style={styles.socialButton}
            >
              <Icon name="logo-twitter" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openFacebook}
              activeOpacity={0.8}
              style={styles.socialButton}
            >
              <Icon name="logo-facebook" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openMastodon}
              activeOpacity={0.8}
              style={styles.socialButton}
            >
              <Icon name="logo-mastodon" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logoRow: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
  title: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { color: COLORS.TEXT.PRIMARY, marginLeft: 8 },
  actionsRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D17A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  buttonText: { marginLeft: 8, color: '#000', fontWeight: '700' },
  buttonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BUTTON.PRIMARY.BORDER,
  },
  buttonOutlineText: { color: COLORS.BUTTON.PRIMARY.TEXT },
  socialRow: { flexDirection: 'row', marginTop: 18 },
  socialButton: { marginRight: 12 },
  versionRow: { marginTop: 40, alignItems: 'center' },
  versionText: { color: '#777' },
  linkText: { color: COLORS.TEXT.LINK, textDecorationLine: 'underline' },
  smallText: { color: '#AAAAAA', fontSize: 12, marginTop: 2 },
  section: { marginTop: 12, marginBottom: 8 },
  sectionTitle: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  addressBlock: { marginBottom: 8 },
  addressLine: { color: COLORS.TEXT.PRIMARY, fontSize: 14 },
  contactLabel: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
  },
  phoneContainer: { marginLeft: 8 },
  textBlock: {
    marginLeft: 12,
    flex: 1,
  },
});
