import { Dimensions, PixelRatio, Platform } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base width and height for scaling (iPhone 11 Pro as reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * ============================================================
 * PHILIPPINE PHONE MODEL COMPATIBILITY (2023-2026)
 * ============================================================
 * Comprehensive support for all popular phones in the Philippines
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 SAMSUNG (Most Popular Brand in PH)
 * ═══════════════════════════════════════════════════════════
 * S-Series (Flagship):
 *   - Galaxy S23, S23+, S23 Ultra (2023)
 *   - Galaxy S24, S24+, S24 Ultra, S24 FE (2024)
 *   - Galaxy S25, S25+, S25 Ultra, S25 FE, S25 Edge (2025)
 *   - Screen: 6.1" - 6.9" | Width: 360-412px
 * 
 * A-Series (Mid-Range - VERY POPULAR):
 *   - Galaxy A14, A14 5G, A24 4G, A34, A54 (2023)
 *   - Galaxy A25 5G, A35 5G, A55 5G (2024)
 *   - Galaxy A16 5G, A26 5G, A36 5G, A56 5G (2025)
 *   - Screen: 6.4" - 6.7" | Width: 360-393px
 * 
 * M-Series (Budget):
 *   - Galaxy M14, M34 5G, M54 5G (2023)
 *   - Galaxy M55 5G (2024)
 *   - Galaxy M36 5G, M56 5G (2025)
 *   - Screen: 6.4" - 6.7" | Width: 360-393px
 * 
 * F-Series:
 *   - Galaxy F04, F14, F54 (2023)
 *   - Galaxy F36 5G, F56 5G (2025)
 * 
 * Xcover (Rugged):
 *   - Galaxy Xcover 7, Xcover 7 Pro
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 REALME (Very Popular Budget Brand)
 * ═══════════════════════════════════════════════════════════
 * Number Series:
 *   - Realme 10, 10 Pro, 11, 11 Pro, 11 Pro+ (2023)
 *   - Realme 12, 12 Pro, 12 Pro+ 5G (2024)
 *   - Realme 14 5G, 14 Pro, 14 Pro+ (2025)
 *   - Realme 15 5G, 15 Pro 5G, 15T 5G (2025)
 *   - Screen: 6.4" - 6.7" | Width: 360-393px
 * 
 * GT Series (Gaming):
 *   - Realme GT 6T, GT Neo6 SE (2024)
 *   - Realme GT 7, GT 7T (2025)
 * 
 * C-Series (Budget - TOP SELLER):
 *   - Realme C33, C55, C63 (2023-2024)
 *   - Realme C71, C75, C75X, C85 5G (2025)
 *   - Screen: 6.5" - 6.7" | Width: 360-393px
 * 
 * Narzo Series:
 *   - Narzo 80 Lite, 90, 90x, 90 Pro
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 OPPO
 * ═══════════════════════════════════════════════════════════
 * Find X Series (Flagship):
 *   - Find X6, X6 Pro (2023)
 *   - Find X7, X7 Ultra (2024)
 *   - Find X8, X8 Pro, X8 Ultra (2025)
 *   - Find X9, X9 Pro (2025)
 *   - Screen: 6.7" - 6.8" | Width: 393-412px
 * 
 * Reno Series (Mid-Range):
 *   - Reno 8, 9, 10 Series (2023)
 *   - Reno14 5G, Reno14 Pro 5G, Reno14 F 5G, Reno14 FS 5G (2025)
 * 
 * A-Series (Budget):
 *   - OPPO A6x 5G, A6x, A58, A78
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 APPLE iPhone
 * ═══════════════════════════════════════════════════════════
 * iPhone 15 Series (2023):
 *   - iPhone 15 (6.1") - Width: 393px
 *   - iPhone 15 Plus (6.7") - Width: 430px
 *   - iPhone 15 Pro (6.1") - Width: 393px
 *   - iPhone 15 Pro Max (6.7") - Width: 430px
 * 
 * iPhone 16 Series (2024):
 *   - iPhone 16 (6.1") - Width: 393px
 *   - iPhone 16 Plus (6.7") - Width: 430px
 *   - iPhone 16 Pro (6.3") - Width: 402px
 *   - iPhone 16 Pro Max (6.9") - Width: 440px
 *   - iPhone 16e (budget) - Width: 375px
 * 
 * iPhone 17 Series (2025):
 *   - iPhone 17, 17 Pro, 17 Pro Max
 *   - iPhone Air (new slim design)
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 HONOR
 * ═══════════════════════════════════════════════════════════
 * Honor 90 / 90 Pro Series (2023)
 * Honor Magic6 Pro (flagship)
 * Honor X-Series: X7, X8, X9, X9b, X9c, X9d 5G, X7c
 * Honor 200 5G, 200 Pro 5G, 200 Smart 5G (2024)
 * Honor 300 series (2024-2025)
 * Honor 400, 400 Pro (2025)
 * Honor 500, 500 Pro (2025)
 * Honor Magic8, Magic8 Pro (2025)
 * Honor Magic V5 (Foldable)
 * Honor Power2 (big battery)
 * Screen: 6.5" - 6.8" | Width: 360-412px
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 XIAOMI / REDMI / POCO (Top Budget Brand)
 * ═══════════════════════════════════════════════════════════
 * Xiaomi Flagships:
 *   - Xiaomi 13, 13 Pro, 13 Ultra (2023)
 *   - Xiaomi 14, 14T, 14T Pro, 14 Ultra (2024)
 *   - Xiaomi 15, 15T, 15T Pro, 15 Ultra (2025)
 * 
 * Redmi Note Series (BEST SELLERS):
 *   - Redmi Note 12, 12 Pro, 12 Pro+ (2023)
 *   - Redmi Note 13, 13 Pro, 13 Pro+ (2024)
 *   - Redmi Note 14, 14 Pro, 14 Pro+, 14 SE 5G (2024-2025)
 *   - Redmi Note 15, 15 5G, 15 Pro, 15 Pro 5G, 15 Pro+ 5G (2025)
 *   - Screen: 6.6" - 6.7" | Width: 393px
 * 
 * Redmi Budget:
 *   - Redmi 13, 13x, 15, 15 5G, 15C, 15C 5G
 *   - Redmi A3, A3x, A5 (Entry-level)
 *   - Screen: 6.5" - 6.7" | Width: 360-393px
 * 
 * Redmi K-Series (Gaming):
 *   - Redmi K70, K80 series
 * 
 * POCO:
 *   - POCO M8 5G, M8 Pro 5G
 *   - POCO X7, X7 Pro (TOP TRENDING)
 *   - POCO F8 Pro, F8 Ultra
 *   - Screen: 6.6" - 6.7" | Width: 393-412px
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 INFINIX (Budget King in PH)
 * ═══════════════════════════════════════════════════════════
 * Note Series:
 *   - Infinix Note 40, 40 5G, 40 Pro, 40 Pro+ 5G (2024)
 *   - Infinix Note 50, 50 Pro, 50 Pro 4G, 50 Pro+ 5G (2025)
 *   - Screen: 6.7" - 6.8" | Width: 393px
 * 
 * Hot Series (TOP SELLER):
 *   - Infinix Hot 20 4G/5G (2023)
 *   - Infinix Hot 50, 50i, 50 5G, 50 Pro, 50 Pro+ (2024-2025)
 *   - Infinix Hot 60, 60 5G+, 60 Pro, 60 Pro+ (2025)
 *   - Screen: 6.6" - 6.8" | Width: 360-393px
 * 
 * GT Series (Gaming):
 *   - Infinix GT 20 Pro (2024)
 *   - Infinix GT 30 Pro (TOP TRENDING 2025)
 * 
 * Smart Series (Entry):
 *   - Infinix Smart 8, 8 Pro, 9, 10, 10 Plus
 *   - Screen: 6.5" - 6.7" | Width: 360px
 * 
 * Zero Series (Premium):
 *   - Infinix Zero 30, 30 5G, 40 5G, Flip 5G
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 TECNO (Budget - Sister of Infinix)
 * ═══════════════════════════════════════════════════════════
 * CAMON Series (Camera-focused):
 *   - TECNO Camon 30, 30 Pro 5G, 30 Premier 5G
 *   - TECNO CAMON 40 Pro 5G (TOP TRENDING)
 * 
 * POVA Series (Gaming/Battery):
 *   - TECNO POVA 7 (TRENDING)
 * 
 * Spark Series (Budget):
 *   - TECNO Spark Go 2, 40, 40 Pro, 40 Pro+
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 ITEL (Entry-Level)
 * ═══════════════════════════════════════════════════════════
 * itel S24 (April 2024)
 * itel A50, A50C (May-Aug 2024)
 * Screen: 6.5" - 6.6" | Width: 360px
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 VIVO
 * ═══════════════════════════════════════════════════════════
 * vivo X200 Series (Flagship)
 * vivo V Series (Mid-Range)
 * vivo Y Series (Budget)
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 HUAWEI
 * ═══════════════════════════════════════════════════════════
 * Huawei Nova 14 Series
 * 
 * ═══════════════════════════════════════════════════════════
 * 📱 ASUS
 * ═══════════════════════════════════════════════════════════
 * ASUS ROG Phone 9 Pro (Gaming)
 * 
 * ═══════════════════════════════════════════════════════════
 * 🔥 TRENDING IN PHILIPPINES 2025
 * ═══════════════════════════════════════════════════════════
 * 1. HONOR X9c 5G
 * 2. Infinix HOT 50 Pro+
 * 3. TECNO CAMON 40 Pro 5G
 * 4. Redmi Note 14
 * 5. Infinix GT 30 Pro
 * 6. TECNO POVA 7
 * 7. Infinix NOTE 50 Pro
 * 8. Infinix HOT 60 Pro
 * 9. POCO X7 Pro
 * 10. HONOR X7c
 * ═══════════════════════════════════════════════════════════
 * 
 * SCREEN WIDTH RANGES:
 *   - Budget phones: 360px (6.5" screens)
 *   - Mid-range: 393px (6.6"-6.7" screens)
 *   - Flagship: 412px (6.7"-6.8" screens)
 *   - iPhone: 375px-440px (6.1"-6.9" screens)
 *   - Ultra/Max: 430px+ (6.9"+ screens)
 * ============================================================
 */

/**
 * RESPONSIVE SCALING UTILITIES
 * Automatically adjusts to any phone screen size
 */

// Detect device category based on screen width
// Optimized for Philippine phone market (2023-2026)
const getDeviceCategory = () => {
  // XSmall: Very old/rare phones
  if (SCREEN_WIDTH < 340) return 'xsmall';
  
  // Small: iPhone SE, itel, old budget phones
  if (SCREEN_WIDTH < 360) return 'small';
  
  // Medium: Most budget phones in PH
  // Infinix Smart/Hot, TECNO Spark, Realme C-series, Redmi A-series
  // Samsung A14, M14, itel S24/A50
  if (SCREEN_WIDTH < 380) return 'medium';
  
  // Large: Most mid-range phones in PH
  // Redmi Note series, Samsung A25/A35/A55, POCO X7
  // Infinix Note, HONOR X9c, Realme number series
  // iPhone 15/16 base models
  if (SCREEN_WIDTH < 400) return 'large';
  
  // XLarge: Flagship phones
  // Samsung S24/S25, Xiaomi 14/15, OPPO Find X
  // iPhone Pro Max, Galaxy Ultra
  if (SCREEN_WIDTH < 430) return 'xlarge';
  
  // XXLarge: Ultra/Max phones, tablets in phone mode
  return 'xxlarge';
};

// Detect device category based on screen height
// Modern phones have tall aspect ratios (19.5:9, 20:9, 21:9)
const getDeviceHeightCategory = () => {
  // Short: iPhone SE, compact phones
  if (SCREEN_HEIGHT < 680) return 'xshort';
  if (SCREEN_HEIGHT < 740) return 'short';
  
  // Medium: Standard 16:9 phones (older models)
  if (SCREEN_HEIGHT < 800) return 'medium';
  
  // Tall: Modern phones with notch/punch-hole (19.5:9)
  // Most 2023-2025 phones fall here
  if (SCREEN_HEIGHT < 880) return 'tall';
  
  // XTall: Ultra-tall phones (20:9, 21:9)
  // Samsung Ultra, Xiaomi flagships, Infinix Note
  if (SCREEN_HEIGHT < 950) return 'xtall';
  
  // XXTall: Very tall phones, foldables in narrow mode
  return 'xxtall';
};

const DEVICE_CATEGORY = getDeviceCategory();
const DEVICE_HEIGHT_CATEGORY = getDeviceHeightCategory();

// Scale based on screen width
export const scaleWidth = (size) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

// Scale based on screen height
export const scaleHeight = (size) => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

// Scale fonts with PixelRatio for better readability
// Includes min/max constraints to prevent fonts from being too small or too large
export const scaleFont = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  const scaledSize = Math.round(PixelRatio.roundToNearestPixel(newSize));
  
  // Constraints: min 10px, max = size * 1.3 (30% larger than design)
  const minSize = Math.max(10, size * 0.8);
  const maxSize = size * 1.3;
  
  return Math.max(minSize, Math.min(maxSize, scaledSize));
};

// Moderate scale - less aggressive scaling for margins/padding
// factor: 0.3 for small devices, 0.5 for medium, 0.7 for large
export const moderateScale = (size, factor = 0.5) => {
  // Adjust factor based on device category for better consistency
  let adjustedFactor = factor;
  if (DEVICE_CATEGORY === 'xsmall' || DEVICE_CATEGORY === 'small') {
    adjustedFactor = Math.min(factor, 0.3);
  } else if (DEVICE_CATEGORY === 'xlarge') {
    adjustedFactor = Math.max(factor, 0.6);
  }
  
  return size + (scaleWidth(size) - size) * adjustedFactor;
};

// Responsive value picker based on device size
// Supports 6 breakpoints for all Philippine phone models
export const responsiveValue = (xsmall, small, medium, large, xlarge, xxlarge = null) => {
  switch (DEVICE_CATEGORY) {
    case 'xsmall': return xsmall;
    case 'small': return small;
    case 'medium': return medium;
    case 'large': return large;
    case 'xlarge': return xlarge;
    case 'xxlarge': return xxlarge !== null ? xxlarge : xlarge;
    default: return medium;
  }
};

// Simplified responsive value (3 breakpoints: compact, standard, expanded)
export const responsive3 = (compact, standard, expanded) => {
  if (DEVICE_CATEGORY === 'xsmall' || DEVICE_CATEGORY === 'small') return compact;
  if (DEVICE_CATEGORY === 'medium' || DEVICE_CATEGORY === 'large') return standard;
  return expanded;
};

// Get responsive padding based on screen width
export const getResponsivePadding = () => {
  switch (DEVICE_CATEGORY) {
    case 'xsmall': return 12;
    case 'small': return 14;
    case 'medium': return 16;
    case 'large': return 18;
    case 'xlarge': return 20;
    case 'xxlarge': return 24;
    default: return 16;
  }
};

// Get responsive font scale
export const getResponsiveFontScale = () => {
  switch (DEVICE_CATEGORY) {
    case 'xsmall': return 0.85;
    case 'small': return 0.9;
    case 'medium': return 0.95;
    case 'large': return 1.0;
    case 'xlarge': return 1.05;
    case 'xxlarge': return 1.1;
    default: return 1.0;
  }
};

// New: Safe area for different notch/punch-hole styles
export const getSafeAreaPadding = () => {
  // Rough estimates for different phone styles
  if (Platform.OS === 'ios') {
    if (SCREEN_HEIGHT >= 812) return { top: 47, bottom: 34 }; // iPhone X and newer
    return { top: 20, bottom: 0 }; // Older iPhones
  }
  
  // Android - most have punch-hole or notch
  if (DEVICE_HEIGHT_CATEGORY === 'xtall') return { top: 35, bottom: 20 };
  if (DEVICE_HEIGHT_CATEGORY === 'tall') return { top: 30, bottom: 15 };
  return { top: 24, bottom: 0 };
};

/**
 * Minimum bottom padding for screens with scroll views
 * Accounts for different phone navigation bar styles:
 * - Gesture navigation: ~20-24px home bar
 * - 3-button navigation: ~48-56px navigation bar (Infinix, TECNO, budget phones)
 * - iPhone home indicator: ~34px
 */
export const getMinBottomPadding = () => {
  if (Platform.OS === 'ios') {
    // iPhone X and newer have home indicator
    return SCREEN_HEIGHT >= 812 ? 30 : 10;
  }
  
  // Android - use aspect ratio to detect navigation style
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  
  if (aspectRatio > 2.2) {
    // Ultra-tall phones (21:9+) - likely gesture nav
    return 20;
  } else if (aspectRatio > 2.0) {
    // Tall phones - could be either
    return 28;
  } else {
    // Standard aspect ratio - likely 3-button nav, needs MORE padding
    return 35;
  }
};

// Constant for screens to use (calculates once at load)
export const MIN_BOTTOM_PADDING = getMinBottomPadding();

/**
 * COLOR SYSTEM - Enhanced Modern Palette
 */

export const Colors = {
  // Brand (shared across passenger + conductor)
  brand: {
    // Subtle Gradient Orange (shared theme)
    orangeGradient: ['#FF7A45', '#FFB38A'],
    orangeGradientSoft: ['#FFF3ED', '#FFE3D6'],
    orangeSolid: '#FF6B45',
    onOrange: '#FFFFFF',
  },

  // Passenger Theme - aliased to rapidTransit so all passenger screens
  // share the same primary/background/CTA colors as the login/auth screens.
  // Keys are preserved for backwards compat with existing screens.
  passenger: {
    primary: '#FF5722',          // RT.primary
    secondary: '#E64A19',        // RT.primaryDark
    tertiary: '#FB923C',         // matches RT.avatarGradient end
    gradient: ['#FF5722', '#FB923C'],  // RT.avatarGradient
    gradientDark: ['#E64A19', '#C2410C'],
    gradientSubtle: ['#FFF5F2', '#FFE0D4'], // RT.primarySoft -> primarySoftBorder
    light: '#FFCCBC',            // RT.primaryMuted
    ultraLight: '#FFF5F2',       // RT.primarySoft
    background: '#F8FAFC',       // RT.bg / RT.slate50
    cardBg: '#FFFFFF',
    text: '#FFFFFF',
    textDark: '#1E293B',         // RT.slate800
    textMuted: '#64748B',        // RT.slate500
    accent: '#FF5722',
    success: '#10B981',          // RT.emerald500
    border: '#E2E8F0',           // RT.slate200
  },
  
  // Conductor Theme - Warm Gold/Amber (Refined & Modern)
  conductor: {
    primary: '#C9A227',
    secondary: '#A68A1F',
    tertiary: '#E6C547',
    gradient: ['#C9A227', '#E6B833'],
    gradientDark: ['#A68A1F', '#8B7518'],
    gradientSubtle: ['#FFFDF5', '#FFF9E6'],
    light: '#FFE082',
    ultraLight: '#FFF8E1',
    background: '#FAFAFA',
    cardBg: '#FFFFFF',
    text: '#FFFFFF',
    textDark: '#2D2D2D',
    textMuted: '#757575',
    accent: '#FFB300',
    success: '#4CAF50',
    border: '#FFE0A0',
  },
  
  // Common Colors - Modern Neutral Palette
  common: {
    white: '#FFFFFF',
    black: '#000000',
    background: '#F8F9FA',
    cardBackground: '#FFFFFF',
    border: '#E8ECEF',
    borderLight: '#F0F3F5',
    placeholder: '#9E9E9E',
    textPrimary: '#1A1A2E',
    textSecondary: '#4A4A5A',
    textMuted: '#8A8A9A',
    textLight: '#B0B0C0',
    error: '#E53935',
    errorLight: '#FFEBEE',
    success: '#43A047',
    successLight: '#E8F5E9',
    warning: '#FFB300',
    warningLight: '#FFF8E1',
    info: '#1E88E5',
    infoLight: '#E3F2FD',
    disabled: '#E0E0E0',
    shadow: '#1A1A2E',
    overlay: 'rgba(26, 26, 46, 0.6)',
    overlayLight: 'rgba(26, 26, 46, 0.3)',
  },
  
  // Gradient Presets
  gradients: {
    passengerHeader: ['#FF5722', '#FB923C', '#FFB38A'],
    conductorHeader: ['#C9A227', '#E6B833', '#FFD54F'],
    card: ['#FFFFFF', '#F8FAFC'],
    success: ['#10B981', '#34D399'],
    danger: ['#EF4444', '#F87171'],
  },

  login: {
    passenger: {
      primary: '#FF6B45',
      primaryDark: '#E85D3A',
      gradient: ['#FF7A45', '#FFB38A'],
      accent: '#FFE3D6',
      accentText: '#C2410C',
      cardBg: 'rgba(255,255,255,0.95)',
      inputBg: '#F8FAFC',
      inputBorder: '#E2E8F0',
      inputFocusBorder: '#FF6B45',
      placeholder: '#94A3B8',
    },
    conductor: {
      primary: '#FF6B45',
      primaryDark: '#E85D3A',
      gradient: ['#FF7A45', '#FFB38A'],
      accent: '#FFE3D6',
      accentText: '#C2410C',
      cardBg: 'rgba(255,255,255,0.95)',
      inputBg: '#F8FAFC',
      inputBorder: '#E2E8F0',
      inputFocusBorder: '#FF6B45',
      placeholder: '#94A3B8',
    },
  },

  floatingTab: {
    // Used as a fallback; tab bars now prefer brand gradient.
    bg: '#0F172A',
    bgConductor: '#0F172A',
    iconActive: '#FFFFFF',
    iconInactive: 'rgba(255,255,255,0.4)',
    dotPassenger: 'rgba(255,255,255,0.95)',
    dotConductor: 'rgba(255,255,255,0.95)',
  },

  dashboard: {
    passenger: {
      primary: '#FF6B45',
      primaryLight: '#FFE3D6',
      headerBg: '#FFFFFF',
      searchCardBg: '#FFFFFF',
      serviceBus: '#3B82F6',
      serviceRoutes: '#8B5CF6',
      serviceWallet: '#10B981',
      serviceSchedule: '#F59E0B',
    },
    conductor: {
      primary: '#FF6B45',
      primaryLight: '#FFE3D6',
      headerGradient: ['#C9A227', '#E6B833', '#FFD54F'],
      statsBg: '#FFFFFF',
      scanBtnBg: '#FF6B45',
      boardingAmber: '#F59E0B',
      boardingGreen: '#10B981',
    },
  },

  /** Slate + blue “RapidTransit”-style passenger UI */
  rapidTransit: {
    bg: '#F8FAFC',
    slate50: '#F8FAFC',
    slate100: '#F1F5F9',
    slate200: '#E2E8F0',
    slate300: '#CBD5E1',
    slate400: '#94A3B8',
    slate500: '#64748B',
    slate600: '#475569',
    slate800: '#1E293B',
    slate900: '#0F172A',
    /** EzSakay orange brand (prototype) */
    primary: '#FF5722',
    primaryDark: '#E64A19',
    primarySoft: '#FFF5F2',
    primarySoftBorder: '#FFE0D4',
    primaryMuted: '#FFCCBC',
    walletDark: '#0F172A',
    /** Orange blob on dark wallet card */
    walletAccentBlob: 'rgba(255, 87, 34, 0.22)',
    avatarGradient: ['#FF5722', '#FB923C'],
    blue500: '#3B82F6',
    blue600: '#2563EB',
    blue50: '#EFF6FF',
    indigo600: '#4F46E5',
    emerald500: '#10B981',
    emerald600: '#059669',
    emerald50: '#ECFDF5',
    red500: '#EF4444',
    red50: '#FEF2F2',
    amber500: '#F59E0B',
    amber50: '#FFFBEB',
    violet600: '#9333EA',
    orange500: '#F97316',
    white: '#FFFFFF',
    success: '#10B981',
    successSoft: '#ECFDF5',
    error: '#EF4444',
    errorSoft: '#FEF2F2',
    warning: '#F59E0B',
    warningSoft: '#FFFBEB',
    switchTrackOn: 'rgba(255, 87, 34, 0.35)',
    switchTrackOff: '#E2E8F0',
    qrFrameBg: '#FFFFFF',
    overlayScrim: 'rgba(248, 250, 252, 0.92)',
    /** Legacy key: dark hero card (no blue gradient) */
    walletGradient: ['#0F172A', '#1E293B'],
    tabBarBg: '#0F172A',
    tabBarBorder: 'rgba(255,255,255,0.1)',
    tabActive: '#FF5722',
    cardRadiusLarge: 48,
    cardRadius: 28,
  },
};

/**
 * TYPOGRAPHY SYSTEM
 */

export const Typography = {
  // Font Families
  fonts: {
    regular: 'Poppins-Regular',
    medium: 'Poppins-Medium',
    semiBold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
  },
  
  // Font Sizes (Responsive)
  sizes: {
    tiny: scaleFont(10),
    small: scaleFont(12),
    body: scaleFont(14),
    medium: scaleFont(16),
    large: scaleFont(18),
    xlarge: scaleFont(20),
    xxlarge: scaleFont(24),
    huge: scaleFont(28),
    massive: scaleFont(32),
  },
  
  // Line Heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

/**
 * SPACING SYSTEM (Responsive)
 */

export const Spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
  xxxl: moderateScale(32),
  huge: moderateScale(40),
  massive: moderateScale(48),
};

/**
 * BORDER RADIUS SYSTEM
 */

export const BorderRadius = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  round: moderateScale(50),
  circle: moderateScale(999),
};

/**
 * SHADOW SYSTEM - Enhanced Modern Shadows
 */

export const Shadows = {
  xs: {
    shadowColor: Colors.common.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  small: {
    shadowColor: Colors.common.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.common.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: Colors.common.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: Colors.common.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  // Colored shadows for buttons
  passengerButton: {
    shadowColor: Colors.passenger.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  conductorButton: {
    shadowColor: Colors.conductor.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  // Card hover/active state
  cardHover: {
    shadowColor: Colors.common.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  // Soft inner glow effect
  innerGlow: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 0,
  },
};

/**
 * COMMON STYLES (Reusable) - Enhanced Modern Components
 */

export const CommonStyles = {
  // Flex utilities
  flexCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexRow: {
    flexDirection: 'row',
  },
  flexBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Container
  container: {
    flex: 1,
    backgroundColor: Colors.common.background,
  },
  
  // Modern Card Variants
  card: {
    backgroundColor: Colors.common.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.common.borderLight,
    ...Shadows.medium,
  },
  
  cardElevated: {
    backgroundColor: Colors.common.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.large,
  },
  
  cardFlat: {
    backgroundColor: Colors.common.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.common.border,
  },
  
  cardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Shadows.medium,
  },
  
  // Enhanced Input
  input: {
    backgroundColor: Colors.common.white,
    borderWidth: 1.5,
    borderColor: Colors.common.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.regular,
    color: Colors.common.textPrimary,
    ...Shadows.xs,
  },
  
  inputFocused: {
    borderWidth: 2,
    ...Shadows.small,
  },
  
  // Modern Button Variants
  button: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  
  buttonLarge: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  buttonPill: {
    borderRadius: BorderRadius.circle,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg - 2,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header Styles
  header: {
    paddingTop: Platform.OS === 'ios' ? moderateScale(50) : moderateScale(20),
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  
  headerModern: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    ...Shadows.medium,
  },
  
  // Screen padding
  screenPadding: {
    paddingHorizontal: Spacing.lg,
  },
  
  // Avatar Styles
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.common.white,
    ...Shadows.medium,
  },
  
  avatarSmall: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
  },
  
  avatarMedium: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
  },
  
  avatarLarge: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
  },
  
  // Badge Styles
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  
  badgePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.circle,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.common.border,
    marginVertical: Spacing.md,
  },
  
  dividerThick: {
    height: 2,
    backgroundColor: Colors.common.borderLight,
    marginVertical: Spacing.lg,
  },
  
  // Icon Container
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  
  iconContainerSmall: {
    width: moderateScale(32),
    height: moderateScale(32),
  },
  
  iconContainerMedium: {
    width: moderateScale(44),
    height: moderateScale(44),
  },
  
  iconContainerLarge: {
    width: moderateScale(56),
    height: moderateScale(56),
  },
};

/**
 * ANIMATION DURATIONS
 */

export const AnimationDurations = {
  fast: 200,
  normal: 300,
  slow: 500,
};

/**
 * DEVICE HELPERS - Enhanced for Philippine Phone Models
 */

export const Device = {
  // Dimensions
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale(),
  
  // Size categories
  category: DEVICE_CATEGORY,
  heightCategory: DEVICE_HEIGHT_CATEGORY,
  
  // Width Size checks (for layout decisions)
  isXSmallDevice: DEVICE_CATEGORY === 'xsmall',   // <340px (very rare)
  isSmallDevice: DEVICE_CATEGORY === 'small',      // 340-359px (iPhone SE, itel)
  isMediumDevice: DEVICE_CATEGORY === 'medium',    // 360-379px (Infinix Smart/Hot, TECNO Spark)
  isLargeDevice: DEVICE_CATEGORY === 'large',      // 380-399px (Redmi Note, Samsung A, POCO)
  isXLargeDevice: DEVICE_CATEGORY === 'xlarge',    // 400-429px (iPhone Pro, Samsung S, Xiaomi)
  isXXLargeDevice: DEVICE_CATEGORY === 'xxlarge',  // 430px+ (Pro Max, Ultra)
  
  // Simplified checks
  isCompactDevice: DEVICE_CATEGORY === 'xsmall' || DEVICE_CATEGORY === 'small',
  isStandardDevice: DEVICE_CATEGORY === 'medium' || DEVICE_CATEGORY === 'large',
  isExpandedDevice: DEVICE_CATEGORY === 'xlarge' || DEVICE_CATEGORY === 'xxlarge',
  
  // Height checks (for keyboard handling, content fitting)
  isXShortDevice: DEVICE_HEIGHT_CATEGORY === 'xshort',  // <680px
  isShortDevice: DEVICE_HEIGHT_CATEGORY === 'short',     // 680-739px
  isMediumHeightDevice: DEVICE_HEIGHT_CATEGORY === 'medium', // 740-799px
  isTallDevice: DEVICE_HEIGHT_CATEGORY === 'tall',       // 800-879px (most 2024 phones)
  isXTallDevice: DEVICE_HEIGHT_CATEGORY === 'xtall',     // 880-949px
  isXXTallDevice: DEVICE_HEIGHT_CATEGORY === 'xxtall',   // 950px+
  
  // Platform
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  
  // Aspect ratio (for different screen shapes)
  aspectRatio: SCREEN_HEIGHT / SCREEN_WIDTH,
  is16by9: (SCREEN_HEIGHT / SCREEN_WIDTH) >= 1.7 && (SCREEN_HEIGHT / SCREEN_WIDTH) < 1.9,
  is19by9: (SCREEN_HEIGHT / SCREEN_WIDTH) >= 1.9 && (SCREEN_HEIGHT / SCREEN_WIDTH) < 2.1,
  is20by9: (SCREEN_HEIGHT / SCREEN_WIDTH) >= 2.1 && (SCREEN_HEIGHT / SCREEN_WIDTH) < 2.2,
  is21by9: (SCREEN_HEIGHT / SCREEN_WIDTH) >= 2.2,
  isUltraTall: (SCREEN_HEIGHT / SCREEN_WIDTH) > 2.1,
  
  // Safe area estimates
  safeAreaPadding: getSafeAreaPadding(),
  
  // Philippine Phone Brand Width Ranges (2023-2026)
  // Based on actual screen dimensions of popular models
  brandRanges: {
    // Samsung (most popular brand in PH)
    samsung: {
      aSeriesBudget: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 380,  // A14, A24
      aSeriesMid: SCREEN_WIDTH >= 380 && SCREEN_WIDTH <= 400,     // A25, A35, A55
      sSeries: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 412,        // S23, S24, S25
      ultra: SCREEN_WIDTH >= 400 && SCREEN_WIDTH <= 420,          // S23/24/25 Ultra
    },
    
    // Realme
    realme: {
      cSeries: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 393,        // C55, C75, C85
      numberSeries: SCREEN_WIDTH >= 380 && SCREEN_WIDTH <= 400,   // 12, 14, 15 series
      gtSeries: SCREEN_WIDTH >= 393 && SCREEN_WIDTH <= 412,       // GT 6T, GT 7
    },
    
    // OPPO
    oppo: {
      aSeries: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 393,        // A6x, A58, A78
      renoSeries: SCREEN_WIDTH >= 380 && SCREEN_WIDTH <= 400,     // Reno 14 series
      findX: SCREEN_WIDTH >= 393 && SCREEN_WIDTH <= 412,          // Find X8, X9
    },
    
    // iPhone
    iphone: {
      se: SCREEN_WIDTH >= 320 && SCREEN_WIDTH <= 340,             // iPhone SE
      standard: SCREEN_WIDTH >= 375 && SCREEN_WIDTH <= 393,       // iPhone 15/16
      pro: SCREEN_WIDTH >= 393 && SCREEN_WIDTH <= 410,            // iPhone Pro
      proMax: SCREEN_WIDTH >= 410 && SCREEN_WIDTH <= 440,         // iPhone Pro Max
    },
    
    // Honor
    honor: {
      xSeries: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 400,        // X7c, X9c, X9d
      numberSeries: SCREEN_WIDTH >= 380 && SCREEN_WIDTH <= 412,   // 200, 300, 400 series
      magic: SCREEN_WIDTH >= 393 && SCREEN_WIDTH <= 420,          // Magic 6, 8
    },
    
    // Xiaomi / Redmi / POCO (very popular in PH)
    xiaomi: {
      redmiA: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 380,         // Redmi A3, A5
      redmiNote: SCREEN_WIDTH >= 380 && SCREEN_WIDTH <= 400,      // Note 12-15 series
      poco: SCREEN_WIDTH >= 393 && SCREEN_WIDTH <= 412,           // POCO X7, F8
      flagship: SCREEN_WIDTH >= 393 && SCREEN_WIDTH <= 420,       // Xiaomi 14, 15
    },
    
    // Infinix (budget king in PH)
    infinix: {
      smart: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 380,          // Smart 8, 9, 10
      hot: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 393,            // Hot 50, 60 series
      note: SCREEN_WIDTH >= 380 && SCREEN_WIDTH <= 400,           // Note 40, 50 series
      gt: SCREEN_WIDTH >= 393 && SCREEN_WIDTH <= 412,             // GT 20, 30 Pro
    },
    
    // TECNO
    tecno: {
      spark: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 380,          // Spark 40 series
      camon: SCREEN_WIDTH >= 380 && SCREEN_WIDTH <= 400,          // Camon 30, 40
      pova: SCREEN_WIDTH >= 380 && SCREEN_WIDTH <= 400,           // POVA 7
    },
    
    // itel (entry-level)
    itel: {
      all: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 380,            // S24, A50
    },
    
    // vivo
    vivo: {
      ySeries: SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 393,        // Y Series budget
      vSeries: SCREEN_WIDTH >= 380 && SCREEN_WIDTH <= 400,        // V Series mid
      xSeries: SCREEN_WIDTH >= 393 && SCREEN_WIDTH <= 412,        // X200 flagship
    },
  },
  
  // Quick checks for popular segments
  isBudgetPhone: SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 380,       // itel, Infinix Smart/Hot, TECNO Spark
  isMidRangePhone: SCREEN_WIDTH >= 380 && SCREEN_WIDTH < 400,     // Samsung A, Redmi Note, Realme
  isFlagshipPhone: SCREEN_WIDTH >= 400,                            // Samsung S, iPhone Pro, Xiaomi
  
  // Trending phones in PH 2025 (width ~393px)
  isTrendingPhoneSize: SCREEN_WIDTH >= 385 && SCREEN_WIDTH <= 400,
};

/**
 * HELPER FUNCTIONS
 */

// Get themed colors based on user type
export const getThemedColors = (userType) => {
  return userType === 'passenger' ? Colors.passenger : Colors.conductor;
};

// Get responsive value based on device size
export const getResponsiveValue = (small, medium, large) => {
  if (Device.isSmallDevice) return small;
  if (Device.isMediumDevice) return medium;
  return large;
};

/**
 * ============================================================
 * QUICK REFERENCE - Screen Size Categories (2023-2026)
 * ============================================================
 * 
 * XSMALL (<340px):
 *   - Very rare, very old phones
 *   - Minimal padding (12px), smallest fonts
 * 
 * SMALL (340-359px):
 *   - iPhone SE
 *   - itel budget phones
 *   - Compact UI, 14px padding
 * 
 * MEDIUM (360-379px):
 *   - Infinix Smart 8/9/10, Hot 50
 *   - TECNO Spark 40 series
 *   - Realme C33, C55, C75
 *   - Samsung A14, M14
 *   - itel S24, A50
 *   - Redmi A3, A5
 *   - Standard compact UI, 16px padding
 * 
 * LARGE (380-399px):
 *   - Redmi Note 12/13/14/15 series (MOST POPULAR)
 *   - Samsung A25, A35, A55, A56
 *   - HONOR X9c, X9d (TRENDING)
 *   - Infinix Note 40/50, Hot 60 Pro
 *   - TECNO Camon 30/40, POVA 7
 *   - Realme 12/14/15, GT series
 *   - POCO X7, M8
 *   - iPhone 15, 16 base
 *   - Comfortable spacing, 18px padding
 * 
 * XLARGE (400-429px):
 *   - Samsung S24, S25, S25+
 *   - Xiaomi 14, 15
 *   - OPPO Find X8, X9
 *   - POCO X7 Pro, F8
 *   - iPhone 15 Pro, 16 Pro
 *   - Infinix GT 30 Pro
 *   - Honor Magic 8
 *   - Extra breathing room, 20px padding
 * 
 * XXLARGE (430px+):
 *   - iPhone Pro Max (15, 16, 17)
 *   - Samsung S24/S25 Ultra
 *   - Xiaomi 15 Ultra
 *   - OPPO Find X8 Ultra
 *   - Tablet-like spacing, 24px padding
 * 
 * ============================================================
 * 🔥 TRENDING PH PHONES 2025 (Width ~393px = LARGE category)
 * ============================================================
 * 1. HONOR X9c 5G          6. TECNO POVA 7
 * 2. Infinix HOT 50 Pro+   7. Infinix NOTE 50 Pro
 * 3. TECNO CAMON 40 Pro    8. Infinix HOT 60 Pro
 * 4. Redmi Note 14         9. POCO X7 Pro
 * 5. Infinix GT 30 Pro     10. HONOR X7c
 * ============================================================
 */

export default {
  // Scaling utilities
  scaleWidth,
  scaleHeight,
  scaleFont,
  moderateScale,
  responsiveValue,
  responsive3,
  getResponsivePadding,
  getResponsiveFontScale,
  getSafeAreaPadding,
  getMinBottomPadding,
  MIN_BOTTOM_PADDING,
  
  // Design tokens
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  CommonStyles,
  AnimationDurations,
  
  // Device info
  Device,
  
  // Helpers
  getThemedColors,
  getResponsiveValue,
};
