/**
 * Fixed Mascot image management using the user's provided asset
 */

export const USER_PROVIDED_MASCOT_PATH = '/assets/mikasa.jpg';

export function getMascotImage(): string {
  return USER_PROVIDED_MASCOT_PATH;
}

export function setMascotImage(_url: string): void {
  // Mascot is permanently locked to user's provided image
}

export function resetMascotImage(): void {
  // Mascot is permanently locked to user's provided image
}
