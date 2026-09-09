// GENERIERT von scripts/generate-splash.py — nicht von Hand ändern.
// Die Liste beschreibt die iOS-Startbilder in public/splash/.
// Kommt ein Gerät dazu: in DEVICES im Skript ergänzen und es erneut laufen lassen.

export type SplashScreen = {
  /** Pixelbreite der Bilddatei. */
  w: number
  /** Pixelhöhe der Bilddatei. */
  h: number
  deviceWidth: number
  deviceHeight: number
  ratio: number
}

export const SPLASH_SCREENS: SplashScreen[] = [
  { w: 640, h: 1136, deviceWidth: 320, deviceHeight: 568, ratio: 2 }, // iPhone SE (1. Gen), 5s
  { w: 750, h: 1334, deviceWidth: 375, deviceHeight: 667, ratio: 2 }, // iPhone SE (2./3. Gen), 6/7/8
  { w: 1242, h: 2208, deviceWidth: 414, deviceHeight: 736, ratio: 3 }, // iPhone 6+/7+/8+
  { w: 1125, h: 2436, deviceWidth: 375, deviceHeight: 812, ratio: 3 }, // iPhone X/XS, 11 Pro, 12/13 mini
  { w: 828, h: 1792, deviceWidth: 414, deviceHeight: 896, ratio: 2 }, // iPhone XR, 11
  { w: 1242, h: 2688, deviceWidth: 414, deviceHeight: 896, ratio: 3 }, // iPhone XS Max, 11 Pro Max
  { w: 1170, h: 2532, deviceWidth: 390, deviceHeight: 844, ratio: 3 }, // iPhone 12/12 Pro, 13/13 Pro, 14
  { w: 1284, h: 2778, deviceWidth: 428, deviceHeight: 926, ratio: 3 }, // iPhone 12/13/14 Pro Max
  { w: 1179, h: 2556, deviceWidth: 393, deviceHeight: 852, ratio: 3 }, // iPhone 14 Pro, 15/15 Pro, 16
  { w: 1290, h: 2796, deviceWidth: 430, deviceHeight: 932, ratio: 3 }, // iPhone 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  { w: 1206, h: 2622, deviceWidth: 402, deviceHeight: 874, ratio: 3 }, // iPhone 16 Pro
  { w: 1320, h: 2868, deviceWidth: 440, deviceHeight: 956, ratio: 3 }, // iPhone 16 Pro Max
  { w: 1536, h: 2048, deviceWidth: 768, deviceHeight: 1024, ratio: 2 }, // iPad 9,7" / mini
  { w: 1620, h: 2160, deviceWidth: 810, deviceHeight: 1080, ratio: 2 }, // iPad 10,2"
  { w: 1640, h: 2360, deviceWidth: 820, deviceHeight: 1180, ratio: 2 }, // iPad Air 10,9"
  { w: 1668, h: 2224, deviceWidth: 834, deviceHeight: 1112, ratio: 2 }, // iPad Pro 10,5"
  { w: 1668, h: 2388, deviceWidth: 834, deviceHeight: 1194, ratio: 2 }, // iPad Pro 11"
  { w: 2048, h: 2732, deviceWidth: 1024, deviceHeight: 1366, ratio: 2 }, // iPad Pro 12,9"
]
