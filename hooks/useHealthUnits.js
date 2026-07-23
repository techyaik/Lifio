import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '../storage/safeAsyncStorage';

const WEIGHT_UNIT_KEY = 'lifio_weight_unit_v1';
const WATER_UNIT_KEY = 'lifio_water_unit_v1';

export const WEIGHT_UNITS = [
  { code: 'kg', label: 'kg', description: 'Kilograms' },
  { code: 'lbs', label: 'lbs', description: 'Pounds' },
];

export const WATER_UNITS = [
  { code: 'glasses', label: 'Glasses', description: 'Number of glasses (250 ml each)' },
  { code: 'ml', label: 'ml', description: 'Millilitres' },
  { code: 'oz', label: 'oz', description: 'Fluid ounces' },
];

export function convertWeight(value, fromUnit, toUnit) {
  if (!value && value !== 0) return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  if (fromUnit === toUnit) return num;
  if (fromUnit === 'kg' && toUnit === 'lbs') return parseFloat((num * 2.20462).toFixed(1));
  if (fromUnit === 'lbs' && toUnit === 'kg') return parseFloat((num / 2.20462).toFixed(1));
  return num;
}

export function convertWater(value, fromUnit, toUnit) {
  if (!value && value !== 0) return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  if (fromUnit === toUnit) return num;
  // Canonical: glasses (250 ml each)
  let ml = num;
  if (fromUnit === 'glasses') ml = num * 250;
  if (fromUnit === 'oz') ml = num * 29.5735;
  // To target
  if (toUnit === 'glasses') return parseFloat((ml / 250).toFixed(1));
  if (toUnit === 'ml') return Math.round(ml);
  if (toUnit === 'oz') return parseFloat((ml / 29.5735).toFixed(1));
  return num;
}

export function useHealthUnits() {
  const [weightUnit, setWeightUnitState] = useState('kg');
  const [waterUnit, setWaterUnitState] = useState('glasses');

  const loadUnits = useCallback(async () => {
    try {
      const [storedWeight, storedWater] = await Promise.all([
        AsyncStorage.getItem(WEIGHT_UNIT_KEY),
        AsyncStorage.getItem(WATER_UNIT_KEY),
      ]);
      if (storedWeight && WEIGHT_UNITS.some((u) => u.code === storedWeight)) {
        setWeightUnitState(storedWeight);
      }
      if (storedWater && WATER_UNITS.some((u) => u.code === storedWater)) {
        setWaterUnitState(storedWater);
      }
    } catch (e) {
      console.error('[useHealthUnits] Error loading units:', e);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const setWeightUnit = useCallback(async (code) => {
    if (!WEIGHT_UNITS.some((u) => u.code === code)) return;
    setWeightUnitState(code);
    try {
      await AsyncStorage.setItem(WEIGHT_UNIT_KEY, code);
    } catch (e) {
      console.error('[useHealthUnits] Error saving weight unit:', e);
    }
  }, []);

  const setWaterUnit = useCallback(async (code) => {
    if (!WATER_UNITS.some((u) => u.code === code)) return;
    setWaterUnitState(code);
    try {
      await AsyncStorage.setItem(WATER_UNIT_KEY, code);
    } catch (e) {
      console.error('[useHealthUnits] Error saving water unit:', e);
    }
  }, []);

  const formatWeight = useCallback(
    (valueInKg) => {
      if (valueInKg === null || valueInKg === undefined) return null;
      const converted = convertWeight(valueInKg, 'kg', weightUnit);
      return converted !== null ? `${converted} ${weightUnit}` : null;
    },
    [weightUnit]
  );

  const formatWater = useCallback(
    (valueInGlasses) => {
      if (valueInGlasses === null || valueInGlasses === undefined) return null;
      const converted = convertWater(valueInGlasses, 'glasses', waterUnit);
      if (converted === null) return null;
      if (waterUnit === 'glasses') return `${converted} glasses`;
      if (waterUnit === 'ml') return `${converted} ml`;
      if (waterUnit === 'oz') return `${converted} oz`;
      return `${converted}`;
    },
    [waterUnit]
  );

  return {
    weightUnit,
    waterUnit,
    setWeightUnit,
    setWaterUnit,
    weightUnits: WEIGHT_UNITS,
    waterUnits: WATER_UNITS,
    formatWeight,
    formatWater,
    reload: loadUnits,
  };
}
