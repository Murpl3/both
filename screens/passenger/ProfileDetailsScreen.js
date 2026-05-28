import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS } from '../../fonts';
import { Colors, Spacing } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import Card from '../../components/ui/Card';
import TextField from '../../components/ui/TextField';
import { PrimaryButton } from '../../components/ui/Buttons';

const RT = Colors.rapidTransit;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProfileDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user: routeUser } = route.params || {};
  
  const [user, setUser] = useState(routeUser || null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedYear, setSelectedYear] = useState(1992);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const saveSuccessAnim = React.useRef(new Animated.Value(0)).current;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = routeUser || await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
        setUser(parsedUser);
        setFirstName(parsedUser.first_name || '');
        setLastName(parsedUser.last_name || '');
        setEmail(parsedUser.email || '');
        setAddress(parsedUser.address || '');
        setBirthdate(parsedUser.birthdate || '');
        setContact(parsedUser.contact || parsedUser.phone_number || '');
        
        // Parse existing birthdate for picker
        if (parsedUser.birthdate) {
          const parts = parsedUser.birthdate.match(/(\d+)\s+(\w+),?\s+(\d+)/);
          if (parts) {
            setSelectedDay(parseInt(parts[1]));
            const monthIndex = months.findIndex(m => m.toLowerCase() === parts[2].toLowerCase());
            if (monthIndex >= 0) setSelectedMonth(monthIndex);
            setSelectedYear(parseInt(parts[3]));
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const formatBirthdate = (day, month, year) => {
    return `${day} ${months[month]}, ${year}`;
  };

  const handleDateConfirm = () => {
    const formattedDate = formatBirthdate(selectedDay, selectedMonth, selectedYear);
    setBirthdate(formattedDate);
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    // Validation with better feedback
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'First name is required. Please enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Last name is required. Please enter your last name.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Validation Error', 'Address is required. Please enter your address.');
      return;
    }
    if (!birthdate) {
      Alert.alert('Validation Error', 'Birthdate is required. Please select your birthdate.');
      return;
    }
    
    setSaving(true);
    
    // Animate save button
    Animated.timing(fadeAnim, {
      toValue: 0.5,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    try {
      const profileData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        address: address.trim(),
        birthdate: birthdate,
        contact: contact.trim(),
      };
      
      // Get phone number for Supabase update
      const phoneNumber = user?.phone_number || contact;
      
      console.log('💾 Saving profile data:', profileData);
      console.log('📱 User phone:', phoneNumber);
      
      // Backend profile sync is not yet implemented; save locally for now.
      
      // Update local user data
      const updatedUser = {
        ...user,
        ...profileData,
        phone_number: phoneNumber, // Ensure phone number is retained
      };
      
      // Save to AsyncStorage (LOCAL BACKUP)
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('✅ Profile saved to local storage');
      
      // Success animation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(saveSuccessAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
      ]).start();
      
      // Show success message and go back
      Alert.alert(
        '✅ Success', 
        'Your profile has been updated successfully!\n\nAddress: ' + address.trim() + '\nBirthdate: ' + birthdate,
        [
          { 
            text: 'OK', 
            onPress: () => {
              saveSuccessAnim.setValue(0);
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      
      // Reset animations
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Alert.alert(
        'Save Error', 
        'Failed to save profile details. Please check your internet connection and try again.\n\nError: ' + error.message
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Profile details" subtitle="Update your info" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.pagePad}>
        <Card>
        <View style={styles.formSection}>
          <TextField
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter first name"
            autoCapitalize="words"
          />

          <TextField
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter last name"
            autoCapitalize="words"
          />

          <TextField
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address"
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birthdate</Text>
            <TouchableOpacity 
              style={styles.dateInputContainer}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateInput, !birthdate && styles.placeholderText]}>
                {birthdate || '23 December, 1992'}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <TextField
            label="Contact"
            value={contact}
            onChangeText={setContact}
            placeholder="+639123456789"
            keyboardType="phone-pad"
          />

          <TextField
            label="Email"
            value={email}
            editable={false}
          />
          <Text style={styles.emailNote}>Your email address cannot be changed</Text>

          <PrimaryButton
            title="Save Changes"
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            style={styles.saveButton}
          />
        </View>
        </Card>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Birthdate</Text>
              <TouchableOpacity onPress={handleDateConfirm}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerContainer}>
              {/* Month Picker */}
              <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={month}
                    style={[styles.pickerItem, selectedMonth === index && styles.pickerItemSelected]}
                    onPress={() => setSelectedMonth(index)}
                  >
                    <Text style={[styles.pickerItemText, selectedMonth === index && styles.pickerItemTextSelected]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Day Picker */}
              <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {days.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.pickerItem, selectedDay === day && styles.pickerItemSelected]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[styles.pickerItemText, selectedDay === day && styles.pickerItemTextSelected]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Year Picker */}
              <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.pickerItem, selectedYear === year && styles.pickerItemSelected]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text style={[styles.pickerItemText, selectedYear === year && styles.pickerItemTextSelected]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pagePad: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  container: {
    flex: 1,
    backgroundColor: RT.white,
  },
  header: {
    backgroundColor: RT.white,
    paddingTop: Platform.OS === 'ios' ? 8 : 8,
    paddingBottom: 8,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: RT.slate200,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: SCREEN_WIDTH * 0.04,
    zIndex: 1,
  },
  backIcon: {
    color: RT.primary,
    fontSize: Math.min(SCREEN_WIDTH * 0.065, 26),
    fontFamily: FONTS.Rubik.bold,
  },
  headerTitle: {
    color: RT.primary,
    fontSize: Math.min(SCREEN_WIDTH * 0.042, 18),
    fontFamily: FONTS.Rubik.bold,
    letterSpacing: 0.8,
    flex: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
    backgroundColor: RT.bg,
  },
  sectionTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.047, 20),
    fontFamily: FONTS.Rubik.bold,
    color: RT.slate800,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingTop: SCREEN_HEIGHT * 0.03,
    paddingBottom: SCREEN_HEIGHT * 0.025,
  },
  formSection: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingBottom: SCREEN_HEIGHT * 0.05,
  },
  inputGroup: {
    marginBottom: SCREEN_HEIGHT * 0.025,
  },
  label: {
    fontSize: Math.min(SCREEN_WIDTH * 0.032, 13),
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.rapidTransit.bg,
    borderRadius: 10,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingVertical: SCREEN_HEIGHT * 0.018,
    fontSize: Math.min(SCREEN_WIDTH * 0.04, 16),
    fontFamily: FONTS.Rubik.regular,
    color: RT.slate800,
    borderWidth: 1,
    borderColor: RT.slate200,
  },
  inputEmail: {
    backgroundColor: Colors.rapidTransit.bg,
    color: RT.slate800,
    opacity: 0.7,
  },
  placeholderText: {
    color: RT.slate400,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.rapidTransit.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RT.slate200,
    paddingRight: SCREEN_WIDTH * 0.035,
  },
  dateInput: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingVertical: SCREEN_HEIGHT * 0.018,
    fontSize: Math.min(SCREEN_WIDTH * 0.04, 16),
    fontFamily: FONTS.Rubik.regular,
    color: RT.slate800,
  },
  calendarIcon: {
    fontSize: Math.min(SCREEN_WIDTH * 0.055, 22),
  },
  emailNote: {
    fontSize: Math.min(SCREEN_WIDTH * 0.029, 12),
    color: RT.slate400,
    marginTop: 6,
    fontFamily: FONTS.Rubik.regular,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: RT.primary,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.01,
    shadowColor: RT.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: RT.primaryMuted,
    opacity: 0.7,
  },
  saveButtonText: {
    color: RT.white,
    fontSize: Math.min(SCREEN_WIDTH * 0.042, 17),
    fontFamily: FONTS.Rubik.bold,
    letterSpacing: 0.5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: RT.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: RT.slate200,
  },
  modalTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.042, 17),
    fontFamily: FONTS.Rubik.bold,
    color: RT.slate800,
  },
  modalCancel: {
    fontSize: Math.min(SCREEN_WIDTH * 0.038, 15),
    fontFamily: FONTS.Rubik.regular,
    color: RT.slate500,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalDone: {
    fontSize: Math.min(SCREEN_WIDTH * 0.038, 15),
    fontFamily: FONTS.Rubik.bold,
    color: RT.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    height: Math.min(SCREEN_HEIGHT * 0.35, 250),
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingTop: 10,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: SCREEN_HEIGHT * 0.015,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  pickerItemSelected: {
    backgroundColor: RT.primarySoft,
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.038, 15),
    fontFamily: FONTS.Rubik.regular,
    color: RT.slate500,
  },
  pickerItemTextSelected: {
    fontFamily: FONTS.Rubik.bold,
    color: RT.primary,
    fontSize: Math.min(SCREEN_WIDTH * 0.042, 17),
  },
});
