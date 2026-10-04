"use client";
import { GlobalShader } from "./global-shader";

// Keep the legacy export while using the bundled shader, with no remote code.
export function ShaderAnimation() {
  return <GlobalShader />;
}
