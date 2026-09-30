import { forwardRef, useCallback } from 'react';
import { View, Text } from 'react-native';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DATEPICKER_STYLES = `
.richmonks-datepicker-container .react-datepicker-wrapper {
  display: block !important;
  width: 100% !important;
}

.richmonks-datepicker-container .react-datepicker-popper {
  z-index: 9999 !important;
  padding-top: 6px !important;
}

.richmonks-datepicker-container .react-datepicker__triangle {
  display: none !important;
}
`;

const CustomDobInput = forwardRef(function CustomDobInput(
  { onClick, inputStyle, textInputStyle, dobDisplay, wide, CalendarIcon, onInputFocus },
  ref
) {
  const handleClick = (e) => {
    onInputFocus?.();
    onClick?.(e);
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{ width: '100%', cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      id="dob-input"
      aria-label="Select date of birth"
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
    </div>
  );
});

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
  const handleChange = useCallback(
    (date) => {
      if (date) {
        onSelectDate(date);
      }
    },
    [onSelectDate]
  );

  return (
    <div className="richmonks-datepicker-container" style={{ width: '100%', position: 'relative' }}>
      <style>{DATEPICKER_STYLES}</style>
      <DatePicker
        selected={dob}
        onChange={handleChange}
        maxDate={new Date()}
        popperPlacement="bottom-start"
        showPopperArrow={false}
        dateFormat="dd/MM/yyyy"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        customInput={
          <CustomDobInput
            inputStyle={inputStyle}
            textInputStyle={textInputStyle}
            dobDisplay={dobDisplay}
            wide={wide}
            CalendarIcon={CalendarIcon}
            onInputFocus={onInputFocus}
          />
        }
      />
    </div>
  );
}
