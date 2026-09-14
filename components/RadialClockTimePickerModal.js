import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable, Platform } from 'react-native';
import { AppText as Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from './InputField';

export function RadialClockTimePickerModal({ visible, initialTime = '09:00', onConfirm, onCancel, colors }) {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [mode, setMode] = useState('hour'); // 'hour' | 'minute' | 'input'
  const [inputHour, setInputHour] = useState('09');
  const [inputMinute, setInputMinute] = useState('00');

  useEffect(() => {
    if (initialTime) {
      const parts = String(initialTime).split(':');
      const h = parseInt(parts[0], 10) || 9;
      const m = parseInt(parts[1], 10) || 0;
      setHour(h);
      setMinute(m);
      setInputHour(String(h).padStart(2, '0'));
      setInputMinute(String(m).padStart(2, '0'));
    }
  }, [initialTime, visible]);

  if (!visible) return null;

  const handleHourSelect = (h) => {
    setHour(h);
    setInputHour(String(h).padStart(2, '0'));
    setMode('minute');
  };

  const handleMinuteSelect = (m) => {
    setMinute(m);
    setInputMinute(String(m).padStart(2, '0'));
  };

  const handleOk = () => {
    let finalH = hour;
    let finalM = minute;
    if (mode === 'input') {
      finalH = Math.min(23, Math.max(0, parseInt(inputHour, 10) || 0));
      finalM = Math.min(59, Math.max(0, parseInt(inputMinute, 10) || 0));
    }
    const formatted = `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
    onConfirm(formatted);
  };

  const accentColor = colors?.health || '#4EBE9F';

  // Dial numbers positioning calculation
  const CENTER = 120;
  const RADIUS = 82;

  const renderClockDial = () => {
    const isHour = mode === 'hour';

    // For 12 dial positions (12 hours or 12 minute steps of 5)
    const dialPositions = isHour
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    const currentVal = isHour
      ? (hour % 12 === 0 ? 12 : hour % 12)
      : (Math.round(minute / 5) * 5) % 60;
    
    let activeIndex = dialPositions.indexOf(currentVal);
    if (activeIndex === -1) activeIndex = 0;

    // Active position coordinates
    const activeAngleDeg = activeIndex * 30 - 90;
    const activeAngleRad = activeAngleDeg * (Math.PI / 180);
    const activeX = CENTER + RADIUS * Math.cos(activeAngleRad);
    const activeY = CENTER + RADIUS * Math.sin(activeAngleRad);
    const midX = (CENTER + activeX) / 2;
    const midY = (CENTER + activeY) / 2;

    return (
      <View style={styles.dialContainer}>
        {/* Hand line */}
        <View
          style={{
            position: 'absolute',
            left: midX - RADIUS / 2,
            top: midY - 1,
            width: RADIUS,
            height: 2,
            backgroundColor: accentColor,
            transform: [{ rotate: `${activeAngleDeg}deg` }],
          }}
        />

        {/* Center pivot */}
        <View style={[styles.pivot, { backgroundColor: accentColor }]} />

        {/* Dial numbers */}
        {dialPositions.map((val, idx) => {
          const angleRad = (idx * 30 - 90) * (Math.PI / 180);
          const x = CENTER + RADIUS * Math.cos(angleRad);
          const y = CENTER + RADIUS * Math.sin(angleRad);
          const isSelected = isHour
            ? hour === val || (val === 12 && hour === 0) || (val === 12 && hour === 12)
            : Math.abs(minute - val) < 3;

          const label = String(val).padStart(2, '0');

          return (
            <Pressable
              key={idx}
              onPress={() => (isHour ? handleHourSelect(val === 12 ? 12 : val) : handleMinuteSelect(val))}
              style={[
                styles.dialNumberWrap,
                { left: x - 18, top: y - 18 },
                isSelected && { backgroundColor: accentColor },
              ]}
            >
              <Text
                style={[
                  styles.dialNumberText,
                  isSelected && styles.dialNumberTextSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.dialogCard} onPress={(e) => e?.stopPropagation?.()}>
          {/* Header Time Display */}
          <View style={styles.header}>
            <View style={styles.timeDisplayRow}>
              <Pressable onPress={() => setMode('hour')} style={styles.timeSegment} hitSlop={6}>
                <Text style={[styles.timeHeaderText, mode === 'hour' && { color: accentColor }]}>
                  {String(hour).padStart(2, '0')}
                </Text>
              </Pressable>

              <Text style={styles.colonText}>:</Text>

              <Pressable onPress={() => setMode('minute')} style={styles.timeSegment} hitSlop={6}>
                <Text style={[styles.timeHeaderText, mode === 'minute' && { color: accentColor }]}>
                  {String(minute).padStart(2, '0')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Body: Radial Dial or Manual Input */}
          {mode === 'input' ? (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Set Time (24-Hour Format)</Text>
              <View style={styles.inputRow}>
                <InputField
                  value={inputHour}
                  onChangeText={(val) => setInputHour(val.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="HH"
                  containerStyle={{ width: 80 }}
                />
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }}>:</Text>
                <InputField
                  value={inputMinute}
                  onChangeText={(val) => setInputMinute(val.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="MM"
                  containerStyle={{ width: 80 }}
                />
              </View>
            </View>
          ) : (
            renderClockDial()
          )}

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <Pressable
              onPress={() => setMode(mode === 'input' ? 'hour' : 'input')}
              style={styles.keypadButton}
              hitSlop={12}
            >
              <Ionicons
                name={mode === 'input' ? 'time-outline' : 'keypad-outline'}
                size={22}
                color="#A0A5AC"
              />
            </Pressable>

            <View style={styles.rightActions}>
              <Pressable onPress={onCancel} style={styles.actionBtn} hitSlop={8}>
                <Text style={[styles.actionBtnText, { color: accentColor }]}>CANCEL</Text>
              </Pressable>
              <Pressable onPress={handleOk} style={styles.actionBtn} hitSlop={8}>
                <Text style={[styles.actionBtnText, { color: accentColor }]}>OK</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: 310,
    backgroundColor: '#303133',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    backgroundColor: '#262729',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeSegment: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timeHeaderText: {
    fontSize: 56,
    fontFamily: 'Inter_300Light',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  colonText: {
    fontSize: 50,
    fontFamily: 'Inter_300Light',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -1,
  },

  // Dial
  dialContainer: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#3D3E42',
    alignSelf: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  pivot: {
    position: 'absolute',
    left: 116,
    top: 116,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dialNumberWrap: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dialNumberText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#E1E2E4',
  },
  dialNumberTextSelected: {
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },

  // Input fallback
  inputContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#A0A5AC',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 8,
  },
  keypadButton: {
    padding: 8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
});

