import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Generate years from 1950 to current year
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1949 }, (_, i) => (currentYear - i).toString());
const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Get days for a specific month and year
const getDaysInMonth = (month, year) => {
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
};

const ConductorProfileDetailsScreen = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedDay, setSelectedDay] = useState('01');
  const [selectedYear, setSelectedYear] = useState('1990');
  const [datePickerStep, setDatePickerStep] = useState('month'); // 'month', 'day', 'year'
  const [availableDays, setAvailableDays] = useState(getDaysInMonth('01', '1990'));

  useEffect(() => {
    loadProfileData();
  }, []);
  
  // Update available days when month or year changes
  useEffect(() => {
    setAvailableDays(getDaysInMonth(selectedMonth, selectedYear));
    // Adjust selected day if it exceeds available days
    const maxDay = getDaysInMonth(selectedMonth, selectedYear).length;
    if (parseInt(selectedDay) > maxDay) {
      setSelectedDay(maxDay.toString().padStart(2, '0'));
    }
  }, [selectedMonth, selectedYear]);

  const loadProfileData = async () => {
    try {
      // Load username from conductor_data (needed for saving)
      const conductorData = await AsyncStorage.getItem('conductor_data');
      let currentUsername = '';
      if (conductorData) {
        const data = JSON.parse(conductorData);
        currentUsername = data.username || '';
        setUsername(currentUsername);
      }

      // Load profile data - but only if it belongs to the current conductor
      // Store profile per conductor to prevent cross-conductor data leakage
      const profileKey = `conductor_profile_details_${currentUsername}`;
      const profileData = await AsyncStorage.getItem(profileKey);
      
      if (profileData) {
        const profile = JSON.parse(profileData);
        
        // Only set fields if they have actual non-empty values
        // This prevents empty strings from being displayed
        if (profile.first_name && profile.first_name.trim()) {
          setFirstName(profile.first_name.trim());
        }
        if (profile.last_name && profile.last_name.trim()) {
          setLastName(profile.last_name.trim());
        }
        if (profile.address && profile.address.trim()) {
          setAddress(profile.address.trim());
        }
        if (profile.birthdate && profile.birthdate.trim()) {
          setBirthdate(profile.birthdate.trim());
          // Parse existing birthdate for date picker
          const parts = profile.birthdate.split('/');
          if (parts.length === 3) {
            setSelectedMonth(parts[0].padStart(2, '0'));
            setSelectedDay(parts[1].padStart(2, '0'));
            setSelectedYear(parts[2]);
          }
        }
        if (profile.contact && profile.contact.trim()) {
          setContact(profile.contact.trim());
        }
        if (profile.email && profile.email.trim()) {
          setEmail(profile.email.trim());
        }
      }
      // If no profile_data exists for this conductor, all fields remain empty (default state)
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };
  
  // Open date picker with initial values
  const openDatePicker = () => {
    if (birthdate) {
      const parts = birthdate.split('/');
      if (parts.length === 3) {
        setSelectedMonth(parts[0].padStart(2, '0'));
        setSelectedDay(parts[1].padStart(2, '0'));
        setSelectedYear(parts[2]);
      }
    }
    setDatePickerStep('month');
    setShowDatePicker(true);
  };
  
  // Confirm date selection
  const confirmDateSelection = () => {
    const formattedDate = `${selectedMonth}/${selectedDay}/${selectedYear}`;
    setBirthdate(formattedDate);
    setShowDatePicker(false);
    setDatePickerStep('month');
  };
  
  // Get month name from value
  const getMonthName = (value) => {
    const month = MONTHS.find(m => m.value === value);
    return month ? month.label : value;
  };

  const handleSave = async () => {
    // Validate required fields
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'Please enter your first name and last name');
      return;
    }
    
    setSaving(true);
    try {
      const profileDetails = {
        first_name: firstName,
        last_name: lastName,
        address,
        birthdate,
        contact,
        email,
      };

      // Backend conductor profile sync not implemented yet; local save only.

      // Save to AsyncStorage (always keep local copy)
      // Store per conductor to prevent cross-conductor data leakage
      const profileKey = `conductor_profile_details_${username}`;
      await AsyncStorage.setItem(
        profileKey,
        JSON.stringify(profileDetails)
      );

      // Update conductor_data with new profile info
      const conductorData = await AsyncStorage.getItem('conductor_data');
      if (conductorData) {
        const data = JSON.parse(conductorData);
        data.first_name = firstName;
        data.last_name = lastName;
        data.address = address;
        data.birthdate = birthdate;
        data.contact = contact;
        data.email = email;
        // Update full_name as well
        data.full_name = `${firstName} ${lastName}`.trim();
        await AsyncStorage.setItem('conductor_data', JSON.stringify(data));
      }

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile data:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen variant="conductor" padded={false} style={styles.container}>
      <AppHeader title="Profile details" subtitle="Complete your information" onBack={() => navigation.goBack()} variant="conductor" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Profile details</Text>
        <Text style={styles.sectionSubtitle}>
          Please complete your profile information
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter address"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birthdate</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={openDatePicker}
            >
              <Text style={[
                styles.datePickerText,
                !birthdate && styles.datePickerPlaceholder
              ]}>
                {birthdate || 'Select birthdate'}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact</Text>
            <TextInput
              style={styles.input}
              value={contact}
              onChangeText={setContact}
              placeholder="+639XXXXXXXXX"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
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
          <View style={styles.datePickerModal}>
            {/* Modal Header */}
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>
                {datePickerStep === 'month' ? 'Select Month' : 
                 datePickerStep === 'day' ? 'Select Day' : 'Select Year'}
              </Text>
              <TouchableOpacity onPress={confirmDateSelection}>
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            
            {/* Selected Date Preview */}
            <View style={styles.datePreview}>
              <TouchableOpacity 
                style={[styles.datePreviewItem, datePickerStep === 'month' && styles.datePreviewItemActive]}
                onPress={() => setDatePickerStep('month')}
              >
                <Text style={[styles.datePreviewLabel, datePickerStep === 'month' && styles.datePreviewLabelActive]}>Month</Text>
                <Text style={[styles.datePreviewValue, datePickerStep === 'month' && styles.datePreviewValueActive]}>{getMonthName(selectedMonth)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.datePreviewItem, datePickerStep === 'day' && styles.datePreviewItemActive]}
                onPress={() => setDatePickerStep('day')}
              >
                <Text style={[styles.datePreviewLabel, datePickerStep === 'day' && styles.datePreviewLabelActive]}>Day</Text>
                <Text style={[styles.datePreviewValue, datePickerStep === 'day' && styles.datePreviewValueActive]}>{selectedDay}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.datePreviewItem, datePickerStep === 'year' && styles.datePreviewItemActive]}
                onPress={() => setDatePickerStep('year')}
              >
                <Text style={[styles.datePreviewLabel, datePickerStep === 'year' && styles.datePreviewLabelActive]}>Year</Text>
                <Text style={[styles.datePreviewValue, datePickerStep === 'year' && styles.datePreviewValueActive]}>{selectedYear}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Selection List */}
            <FlatList
              data={
                datePickerStep === 'month' ? MONTHS : 
                datePickerStep === 'day' ? availableDays : YEARS
              }
              keyExtractor={(item, index) => datePickerStep === 'month' ? item.value : item}
              showsVerticalScrollIndicator={false}
              style={styles.datePickerList}
              renderItem={({ item }) => {
                const isMonth = datePickerStep === 'month';
                const value = isMonth ? item.value : item;
                const label = isMonth ? item.label : item;
                const isSelected = isMonth ? selectedMonth === value : 
                                   datePickerStep === 'day' ? selectedDay === value : selectedYear === value;
                
                return (
                  <TouchableOpacity
                    style={[styles.datePickerItem, isSelected && styles.datePickerItemSelected]}
                    onPress={() => {
                      if (datePickerStep === 'month') {
                        setSelectedMonth(value);
                        setDatePickerStep('day');
                      } else if (datePickerStep === 'day') {
                        setSelectedDay(value);
                        setDatePickerStep('year');
                      } else {
                        setSelectedYear(value);
                      }
                    }}
                  >
                    <Text style={[styles.datePickerItemText, isSelected && styles.datePickerItemTextSelected]}>
                      {label}
                    </Text>
                    {isSelected && (
                      <Text style={styles.datePickerCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: Colors.conductor.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  headerTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 18,
    color: '#fff',
    letterSpacing: 1,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 20,
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: FONTS.Rubik.medium,
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FONTS.Rubik.regular,
    fontSize: 15,
    color: '#333',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  helpText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: Colors.conductor.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#FFB366',
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Date Picker Button
  datePickerButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 15,
    color: '#333',
  },
  datePickerPlaceholder: {
    color: '#999',
  },
  calendarIcon: {
    fontSize: 20,
  },
  // Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  datePickerCancel: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 16,
    color: '#666',
  },
  datePickerTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 17,
    color: '#333',
  },
  datePickerDone: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 16,
    color: Colors.conductor.primary,
  },
  datePreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  datePreviewItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: Math.min(100, SCREEN_WIDTH * 0.25),
  },
  datePreviewItemActive: {
    backgroundColor: '#FFF5EB',
    borderWidth: 1,
    borderColor: Colors.conductor.primary,
  },
  datePreviewLabel: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  datePreviewLabelActive: {
    color: Colors.conductor.primary,
  },
  datePreviewValue: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 16,
    color: '#333',
  },
  datePreviewValueActive: {
    color: Colors.conductor.primary,
  },
  datePickerList: {
    maxHeight: 300,
  },
  datePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  datePickerItemSelected: {
    backgroundColor: '#FFF5EB',
  },
  datePickerItemText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 16,
    color: '#333',
  },
  datePickerItemTextSelected: {
    fontFamily: FONTS.Rubik.bold,
    color: Colors.conductor.primary,
  },
  datePickerCheckmark: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 18,
    color: Colors.conductor.primary,
  },
});

export default ConductorProfileDetailsScreen;
