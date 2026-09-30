import { useState, useCallback } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DobPicker({
  dob,
  dobDisplay,
  onSelectDate,
  inputStyle,
  textInputStyle,
  wide,
  onInputFocus,
  CalendarIcon,
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleValueChange = useCallback(
    (_event, selectedDate) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
      if (selectedDate) {
        onSelectDate(selectedDate);
      }
    },
    [onSelectDate]
  );

  const handleDismiss = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const handlePress = useCallback(() => {
    onInputFocus?.();
    setShowDatePicker(true);
  }, [onInputFocus]);

  return (
    <>
      <Pressable
        onPress={handlePress}
        accessibilityLabel="Select date of birth"
        id="dob-input"
      >
        <View className="flex-row items-center" style={{ ...inputStyle, pointerEvents: 'none' }}>
          <CalendarIcon size={wide ? 20 : 18} color="#64748B" />
          <Text
            style={{
              ...textInputStyle,
              marginLeft: 10,
              color: dobDisplay ? '#0F172A' : '#94A3B8',
            }}
          >
            {dobDisplay || 'Select your date of birth'}
          </Text>
        </View>
      </Pressable>

      {showDatePicker ? (
        <DateTimePicker
          value={dob || new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
        />
      ) : null}
    </>
  );
}
