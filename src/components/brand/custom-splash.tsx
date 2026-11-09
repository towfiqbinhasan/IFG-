"use client";

/**
 * YOUR CUSTOM SPLASH ANIMATION GOES HERE.
 * Set brand.splash.type = "custom" in src/config/brand.ts to use it.
 *
 * Example with Lottie (npm i lottie-react, put your JSON in /public/brand/):
 *
 *   import Lottie from "lottie-react";
 *   import animation from "../../../public/brand/splash.json";
 *   export function CustomSplash() {
 *     return <Lottie animationData={animation} loop={false} style={{ width: 220 }} />;
 *   }
 */
import { DefaultSplashAnimation } from "./splash-animation";

export function CustomSplash() {
  return <DefaultSplashAnimation />;
}
