import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

import {
  Home2Stroke,
  Home2Solid,
  HeartStroke,
  HeartSolid,
  Wallet1Stroke,
  Wallet1Solid,
  Gear1Stroke,
  Gear1Solid,
  Gears3Stroke,
  FileMultipleStroke,
  FilePencilStroke,
  CheckStroke,
  CheckCircle1Stroke,
  XmarkStroke,
  XmarkCircleStroke,
  ChevronRightStroke,
  ChevronLeftStroke,
  ChevronDownStroke,
  ChevronUpStroke,
  EyeStroke,
  PlusStroke,
  Search1Stroke,
  User4Stroke,
  WaterDrop1Stroke,
  MoonHalfRight5Stroke,
  StopwatchStroke,
  WeightMachine1Stroke,
  Dumbbell1Stroke,
  MapMarker1Stroke,
  Route1Stroke,
  Sun1Stroke,
  Bolt2Stroke,
  Locked1Stroke,
  Unlocked2Stroke,
  Shield2CheckStroke,
  Trash3Stroke,
  CloudRefreshClockwiseStroke,
  QuestionMarkCircleStroke,
  Bell1Stroke,
  BarChart4Stroke,
  PieChart2Stroke,
  Share1Stroke,
  CloudUploadStroke,
  CloudDownloadStroke,
  Flag1Stroke,
  Flower2Stroke,
  CreditCardMultipleStroke,
  Pencil1Stroke,
  TrendUp1Stroke,
  TrendDown1Stroke,
  Stethoscope1Stroke,
  ServiceBell1Stroke,
  EmojiSmileStroke,
} from '@lineiconshq/free-icons/dist/index.esm.js';

// Map standard icon names used across Lifio to Lineicons stroke icons
const ICON_NAME_MAP = {
  // Tabs & Navigation
  home: Home2Stroke,
  'home-outline': Home2Stroke,
  HomeTab: Home2Stroke,
  HomeDashboard: Home2Stroke,

  heart: HeartStroke,
  'heart-outline': HeartStroke,
  HealthTab: HeartStroke,
  HealthDashboard: HeartStroke,
  HealthHistory: HeartStroke,
  HealthLogEntry: HeartStroke,
  HealthDayDetail: HeartStroke,
  pulse: HeartStroke,

  wallet: Wallet1Stroke,
  'wallet-outline': Wallet1Stroke,
  JournalTab: Wallet1Stroke,
  WalletList: Wallet1Stroke,

  settings: Gear1Solid,
  'settings-outline': Gear1Stroke,
  'settings-sharp': Gear1Solid,
  cog: Gear1Solid,
  'cog-outline': Gear1Stroke,
  SettingsTab: Gear1Solid,
  Settings: Gear1Solid,
  'code-working-outline': Gear1Stroke,

  'document-text': FileMultipleStroke,
  'document-text-outline': FileMultipleStroke,
  NotesTab: FileMultipleStroke,
  NotesList: FileMultipleStroke,
  NoteDetail: FileMultipleStroke,
  NoteEditor: FilePencilStroke,

  // Health Metrics
  walk: Route1Stroke,
  'walk-outline': Route1Stroke,
  footsteps: Route1Stroke,
  navigate: MapMarker1Stroke,
  'navigate-outline': MapMarker1Stroke,
  pin: MapMarker1Stroke,
  compass: MapMarker1Stroke,

  flame: Sun1Stroke,
  'flash-outline': Bolt2Stroke,
  sparkles: Bolt2Stroke,
  'sparkles-outline': Bolt2Stroke,

  bed: MoonHalfRight5Stroke,
  'bed-outline': MoonHalfRight5Stroke,
  moon: MoonHalfRight5Stroke,

  water: WaterDrop1Stroke,
  'water-outline': WaterDrop1Stroke,
  WaterReminders: WaterDrop1Stroke,

  'scale-bathroom': WeightMachine1Stroke,
  'scale-outline': WeightMachine1Stroke,

  fitness: StopwatchStroke,
  'fitness-outline': StopwatchStroke,
  stopwatch: StopwatchStroke,
  time: StopwatchStroke,
  'alarm-outline': Bell1Stroke,
  MedicineReminders: Stethoscope1Stroke,
  medkit: Stethoscope1Stroke,

  barbell: Dumbbell1Stroke,
  'barbell-outline': Dumbbell1Stroke,

  // Habits
  HabitsTab: CheckCircle1Stroke,
  HabitsToday: CheckCircle1Stroke,
  HabitDetail: CheckCircle1Stroke,
  HabitEdit: FilePencilStroke,
  AddHabit: PlusStroke,
  checkmark: CheckStroke,
  'checkmark-done': CheckStroke,
  'checkmark-circle': CheckCircle1Stroke,
  'checkmark-circle-outline': CheckCircle1Stroke,

  // General Actions & Controls
  add: PlusStroke,
  'add-circle-outline': PlusStroke,
  close: XmarkStroke,
  'close-circle-outline': XmarkCircleStroke,
  'remove-circle-outline': XmarkCircleStroke,
  search: Search1Stroke,
  create: FilePencilStroke,
  'create-outline': FilePencilStroke,
  'pencil-sharp': Pencil1Stroke,
  'trash-outline': Trash3Stroke,

  // Chevrons & Arrows
  'chevron-forward': ChevronRightStroke,
  'chevron-forward-outline': ChevronRightStroke,
  'arrow-forward': ChevronRightStroke,
  'chevron-back': ChevronLeftStroke,
  'arrow-undo-outline': ChevronLeftStroke,
  'chevron-down': ChevronDownStroke,
  'chevron-up': ChevronUpStroke,
  'ellipsis-horizontal': ChevronDownStroke,

  // Visibility & Security
  eye: EyeStroke,
  'eye-outline': EyeStroke,
  'eye-off-outline': EyeStroke,
  'lock-closed-outline': Locked1Stroke,
  'shield-checkmark': Shield2CheckStroke,
  'shield-checkmark-outline': Shield2CheckStroke,
  PrivacyManagement: Shield2CheckStroke,

  // User & Profile
  'person-outline': User4Stroke,
  person: User4Stroke,
  'body-outline': User4Stroke,

  // Sync & Cloud
  sync: CloudRefreshClockwiseStroke,
  'sync-outline': CloudRefreshClockwiseStroke,
  'refresh-outline': CloudRefreshClockwiseStroke,
  'cloud-upload-outline': CloudUploadStroke,
  'download-outline': CloudDownloadStroke,

  // Miscellaneous
  'notifications-outline': Bell1Stroke,
  'help-buoy': QuestionMarkCircleStroke,
  'information-circle-outline': QuestionMarkCircleStroke,
  Help: QuestionMarkCircleStroke,
  About: QuestionMarkCircleStroke,
  'share-outline': Share1Stroke,
  'pie-chart': PieChart2Stroke,
  'grid-outline': BarChart4Stroke,
  Analytics: BarChart4Stroke,
  segment: BarChart4Stroke,
  flag: Flag1Stroke,
  flower: Flower2Stroke,
  pricetag: CreditCardMultipleStroke,
  'pricetags-outline': CreditCardMultipleStroke,
  TagFilter: CreditCardMultipleStroke,
  MyPlan: FileMultipleStroke,
  'power-outline': Locked1Stroke,
  'happy-outline': EmojiSmileStroke,
  happy: EmojiSmileStroke,
  smile: EmojiSmileStroke,
  'smile-outline': EmojiSmileStroke,
  mood: EmojiSmileStroke,
  'mood-outline': EmojiSmileStroke,
  'open-outline': ChevronRightStroke,
  resize: MapMarker1Stroke,
};

// Parse SVG paths and attributes from Lineicon object
function parseSvgPaths(iconData, color, strokeWidth) {
  if (!iconData || !iconData.svg) return [];
  const svgStr = iconData.svg.replace(/\/{2}>/g, '/>');
  const pathRegex = /<path\s+([^>]*)>/g;
  const attrRegex = /(\w+[-:a-zA-Z]*)="([^"]*)"/g;
  const paths = [];

  let match;
  while ((match = pathRegex.exec(svgStr)) !== null) {
    const rawAttrs = {};
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match[1])) !== null) {
      rawAttrs[attrMatch[1]] = attrMatch[2];
    }

    let fill = rawAttrs.fill;
    let stroke = rawAttrs.stroke;

    if (iconData.hasFill) {
      fill = fill === '{color}' ? color : fill || iconData.defaultFill || 'none';
    } else {
      fill = iconData.defaultFill || 'none';
    }

    if (iconData.hasStroke) {
      stroke = stroke === '{color}' ? color : stroke || iconData.defaultStroke || 'none';
    } else {
      stroke = iconData.defaultStroke || 'none';
    }

    const sw =
      strokeWidth && iconData.hasStrokeWidth
        ? rawAttrs['stroke-width'] === '{strokeWidth}'
          ? strokeWidth.toString()
          : rawAttrs['stroke-width'] || strokeWidth.toString()
        : rawAttrs['stroke-width'];

    paths.push({
      d: rawAttrs.d,
      fill,
      stroke,
      strokeWidth: sw,
      strokeLinecap: rawAttrs['stroke-linecap'],
      strokeLinejoin: rawAttrs['stroke-linejoin'],
      fillRule: rawAttrs['fill-rule'] || 'evenodd',
      clipRule: rawAttrs['clip-rule'] || undefined,
      opacity: rawAttrs.opacity ? parseFloat(rawAttrs.opacity) : undefined,
    });
  }

  return paths;
}

/**
 * Universal LineIcon component for Lifio
 * Supports:
 * - name: String key from ICON_NAME_MAP (e.g. "heart", "wallet", "walk")
 * - icon: Direct Lineicon object (e.g. HeartStroke)
 * - size: Number (default: 24)
 * - color: String (default: "#000000")
 * - strokeWidth: Number (default: 1.5)
 */
export function LineIcon({
  name,
  icon,
  size = 24,
  color = '#000000',
  strokeWidth = 1.6,
  style,
  ...rest
}) {
  const resolvedIcon = useMemo(() => {
    if (icon && icon.svg) return icon;
    if (name && ICON_NAME_MAP[name]) return ICON_NAME_MAP[name];
    // Fallback: HeartStroke if unknown
    return HeartStroke;
  }, [icon, name]);

  const parsedPaths = useMemo(() => {
    return parseSvgPaths(resolvedIcon, color, strokeWidth);
  }, [resolvedIcon, color, strokeWidth]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox={resolvedIcon.viewBox || '0 0 24 24'}
      style={style}
      {...rest}
    >
      {parsedPaths.map((p, idx) => (
        <Path
          key={idx}
          d={p.d}
          fill={p.fill}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          strokeLinecap={p.strokeLinecap}
          strokeLinejoin={p.strokeLinejoin}
          fillRule={p.fillRule}
          clipRule={p.clipRule}
          opacity={p.opacity}
        />
      ))}
    </Svg>
  );
}

// Aliases for seamless drop-in replacement across the app
export const Ionicons = LineIcon;
export const MaterialCommunityIcons = LineIcon;
export const Feather = LineIcon;
export const MaterialIcons = LineIcon;

export {
  Home2Stroke,
  Home2Solid,
  HeartStroke,
  HeartSolid,
  Wallet1Stroke,
  Wallet1Solid,
  Gear1Stroke,
  Gears3Stroke,
  FileMultipleStroke,
  FilePencilStroke,
  CheckStroke,
  CheckCircle1Stroke,
  XmarkStroke,
  XmarkCircleStroke,
  ChevronRightStroke,
  ChevronLeftStroke,
  ChevronDownStroke,
  ChevronUpStroke,
  EyeStroke,
  PlusStroke,
  Search1Stroke,
  User4Stroke,
  WaterDrop1Stroke,
  MoonHalfRight5Stroke,
  StopwatchStroke,
  WeightMachine1Stroke,
  Dumbbell1Stroke,
  MapMarker1Stroke,
  Route1Stroke,
  Sun1Stroke,
  Bolt2Stroke,
  Locked1Stroke,
  Unlocked2Stroke,
  Shield2CheckStroke,
  Trash3Stroke,
  CloudRefreshClockwiseStroke,
  QuestionMarkCircleStroke,
  Bell1Stroke,
  BarChart4Stroke,
  PieChart2Stroke,
  Share1Stroke,
  CloudUploadStroke,
  CloudDownloadStroke,
  Flag1Stroke,
  Flower2Stroke,
  CreditCardMultipleStroke,
  Pencil1Stroke,
  TrendUp1Stroke,
  TrendDown1Stroke,
  Stethoscope1Stroke,
  ServiceBell1Stroke,
};

export default LineIcon;

